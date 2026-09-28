import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Nfc, Plus, Ticket as TicketIcon, Link2, Wallet, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useNfc } from '@/hooks/useNfc';
import { ticketState, activateTicket, isFrozen, frozenRemaining } from '@/utils/ticketActivation';
import { genShortCode, genTicketId } from '@/utils/customerAuth';

const TYPES = [
  { type: 'adult', label: 'Voksen' }, { type: 'child', label: 'Barn' },
  { type: 'senior', label: 'Honnør' }, { type: 'student', label: 'Student' }, { type: 'military', label: 'Militær' },
];

// mode: 'inspect' | 'driver' | 'tvm'
export default function TravelCardPanel({ mode, actorName = 'staff', onTicketAction }) {
  const nfc = useNfc();
  const qc = useQueryClient();
  const [cardNo, setCardNo] = useState('');
  const [manual, setManual] = useState('');
  const [linkPhone, setLinkPhone] = useState('');
  const [topKr, setTopKr] = useState(200);
  const [buyType, setBuyType] = useState('adult');
  const [buyCat, setBuyCat] = useState('single');

  const canSell = mode === 'driver' || mode === 'tvm';

  // Auto-start NFC listener if the device supports it.
  useEffect(() => {
    if (nfc.supported) nfc.startScan(id => setCardNo(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfc.supported]);

  const { data: card, isFetching: lookupFetching } = useQuery({
    queryKey: ['travelcard-by-no', cardNo],
    queryFn: async () => {
      if (!cardNo) return null;
      const list = await base44.entities.TransitCard.filter({ card_number: cardNo });
      return list[0] || null;
    },
    enabled: !!cardNo
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['travelcard-tickets', card?.customer_id],
    queryFn: () => base44.entities.Ticket.filter({ customer_id: card.customer_id }, '-purchased_at', 200),
    enabled: !!card?.customer_id
  });

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const price = pricing.find(p => p.ticket_type === buyType);
  const cost = buyCat === 'period' ? (price?.period_credit_cost || 0) : (price?.credit_cost || 0);

  const submitManual = () => { const v = manual.trim(); if (v) setCardNo(v.toUpperCase()); };
  const clearCard = () => { setCardNo(''); setManual(''); setLinkPhone(''); };

  const invalidateCard = () => qc.invalidateQueries({ queryKey: ['travelcard-by-no', cardNo] });
  const invalidateTickets = () => qc.invalidateQueries({ queryKey: ['travelcard-tickets', card?.customer_id] });

  // Link a physical card to a customer account (by phone). Creates the
  // TransitCard record if the NFC tag isn't registered yet.
  const linkMut = useMutation({
    mutationFn: async () => {
      if (!linkPhone.trim()) throw new Error('Oppgi telefonnummer');
      const cust = await base44.entities.Customer.filter({ phone: linkPhone.trim() });
      if (!cust.length) throw new Error('Kunde ikke funnet på dette nummeret');
      const c = cust[0];
      if (card) return base44.entities.TransitCard.update(card.id, { customer_id: c.id, customer_name: c.name, is_registered: true, status: 'active' });
      return base44.entities.TransitCard.create({
        card_number: cardNo, customer_id: c.id, customer_name: c.name,
        is_registered: true, status: 'active', balance_credits: 0
      });
    },
    onSuccess: () => { invalidateCard(); toast.success('Reisekort knyttet til konto'); setLinkPhone(''); },
    onError: e => toast.error(e.message)
  });

  // Top up the card's credit balance (1 kr = 1 credit).
  const topUpMut = useMutation({
    mutationFn: async () => {
      const amt = Number(topKr);
      if (!amt || amt <= 0) throw new Error('Ugyldig beløp');
      if (!card) throw new Error('Ingen kort lastet');
      const fresh = await base44.entities.TransitCard.filter({ id: card.id });
      const cur = fresh.length ? (fresh[0].balance_credits || 0) : (card.balance_credits || 0);
      await base44.entities.TransitCard.update(card.id, { balance_credits: cur + amt, last_used_at: new Date().toISOString() });
      if (card.customer_id) {
        await base44.entities.Transaction.create({
          customer_id: card.customer_id, customer_name: card.customer_name, type: 'topup',
          amount: amt, kr_amount: amt, description: `Reisekort oppfylling ${amt} kr`, performed_by: actorName
        });
      }
      return amt;
    },
    onSuccess: (amt) => { invalidateCard(); toast.success(`${amt} credits lagt til på kortet`); },
    onError: e => toast.error(e.message)
  });

  // Buy a ticket onto the card, deducting the price from the card balance.
  const buyMut = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('Ingen kort lastet');
      if (!card.customer_id) throw new Error('Kortet er ikke knyttet til en konto — knytt det først');
      if (cost <= 0) throw new Error('Pris ikke satt for denne billettypen');
      const fresh = await base44.entities.TransitCard.filter({ id: card.id });
      const bal = fresh.length ? (fresh[0].balance_credits || 0) : (card.balance_credits || 0);
      if (bal < cost) throw new Error(`Ikke nok credits på kortet (mangler ${cost - bal})`);
      await base44.entities.TransitCard.update(card.id, { balance_credits: bal - cost, last_used_at: new Date().toISOString() });
      const validUntil = buyCat === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      const t = await base44.entities.Ticket.create({
        ticket_id: genTicketId(), type: buyType, ticket_category: buyCat,
        credits_paid: cost, kr_paid: 0, purchase_method: mode === 'tvm' ? 'machine' : 'cashier',
        status: buyCat === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: card.customer_id, customer_name: card.customer_name, issued_by: `${actorName}·reisekort`
      });
      await base44.entities.Transaction.create({
        customer_id: card.customer_id, customer_name: card.customer_name, type: 'purchase',
        amount: cost, description: `Kjøp ${buyType} ${buyCat} på reisekort`, performed_by: actorName, ticket_id: t.id
      });
      return t;
    },
    onSuccess: () => { invalidateCard(); invalidateTickets(); toast.success('Billett kjøpt på reisekortet'); },
    onError: e => toast.error(e.message)
  });

  // Per-ticket action: inspector validates, driver activates.
  const actOnTicket = async (ticket) => {
    if (onTicketAction) { onTicketAction(ticket); return; }
    const now = new Date();
    if (mode === 'inspect') {
      if (ticket.ticket_category === 'period') {
        const ok = ticket.valid_until && new Date(ticket.valid_until) >= now;
        toast[ok ? 'success' : 'error'](ok ? `Periodebillett gyldig til ${new Date(ticket.valid_until).toLocaleDateString('nb-NO')}` : 'Periodebillett utgått');
        return;
      }
      if (ticket.status === 'used') { toast.error('Allerede brukt'); return; }
      if (ticket.status === 'expired') { toast.error('Utgått'); return; }
      await base44.entities.Ticket.update(ticket.id, { status: 'used', used_at: new Date().toISOString() });
      invalidateTickets();
      toast.success('Validert ✓');
    } else if (mode === 'driver') {
      if (isFrozen(ticket, now)) { toast.error(`Frossen — vent ${frozenRemaining(ticket, now)}s`); return; }
      const st = ticketState(ticket, now);
      if (st === 'inactive') { await activateTicket(ticket); toast.success('Aktivert — gyldig 5 min'); }
      else if (st === 'active') { toast.info('Allerede aktiv'); }
      else toast.error(st === 'used' ? 'Allerede brukt' : 'Utgått');
      invalidateTickets();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* NFC prompt */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${nfc.active ? 'bg-green-900/50 border border-green-600' : 'bg-slate-900 border border-slate-700'}`}>
            <Nfc className={`w-5 h-5 ${nfc.active ? 'text-green-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">Fysisk reisekort</p>
            <p className="text-xs text-slate-400">{nfc.supported ? (nfc.active ? 'Lytt etter NFC-tag… hold kortet mot leseren' : 'Trykk Start for å lytte') : 'NFC ikke støttet — skriv inn kortnummer'}</p>
          </div>
          {nfc.supported && !nfc.active && <Button size="sm" onClick={() => nfc.startScan(id => setCardNo(id))}>Start</Button>}
        </div>
        {nfc.error && <p className="text-xs text-red-400">{nfc.error}</p>}
        {!cardNo && (
          <div className="flex gap-2">
            <Input value={manual} onChange={e => setManual(e.target.value.toUpperCase())} placeholder="Kortnummer (UID)…" onKeyDown={e => e.key === 'Enter' && submitManual()} className="bg-slate-900 border-slate-700 text-white font-mono" />
            <Button onClick={submitManual} disabled={lookupFetching}>Slå opp</Button>
          </div>
        )}
      </div>

      {!cardNo && (
        <p className="text-slate-500 text-sm text-center py-6">Skann et reisekort eller tast inn kortnummer for å se billetter, fylle på eller kjøpe.</p>
      )}

      {/* Tag read but no TransitCard registered */}
      {cardNo && !card && !lookupFetching && (
        <div className="bg-slate-800 border border-amber-700/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400"><UserPlus className="w-5 h-5" /><p className="font-bold">Kortet er ikke registrert</p></div>
          <p className="text-xs text-slate-400">Kort-ID: <code className="font-mono bg-slate-900 px-2 py-0.5 rounded">{cardNo}</code></p>
          {canSell ? (
            <>
              <p className="text-sm text-slate-300">Knytt dette fysiske kortet til en kunde via telefonnummer:</p>
              <div className="flex gap-2">
                <Input value={linkPhone} onChange={e => setLinkPhone(e.target.value)} placeholder="Kundens telefon…" className="bg-slate-900 border-slate-700 text-white" />
                <Button onClick={() => linkMut.mutate()} disabled={linkMut.isPending}><Link2 className="w-4 h-4 mr-1" /> Knytt</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={clearCard} className="text-slate-400">← Tøm</Button>
            </>
          ) : (
            <p className="text-sm text-slate-400">Dette kortet har ingen konto. Det kan knyttes fra en TVM eller sjåførterminal.</p>
          )}
        </div>
      )}

      {/* Card loaded */}
      {card && (
        <div className="space-y-3">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Reisekort</p>
                <p className="font-mono font-bold text-white">{card.card_number}</p>
                <p className="text-sm text-slate-300 mt-1">{card.customer_name || 'Ikke knyttet til konto'}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-blue-400">{card.balance_credits || 0}</p>
                <p className="text-xs text-slate-500">credits</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2 py-0.5 rounded-full text-xs ${card.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{card.status}</span>
              <Button variant="ghost" size="sm" onClick={clearCard} className="text-slate-400 h-7">Bytt kort</Button>
            </div>
          </div>

          {/* All tickets on the card */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1"><TicketIcon className="w-3.5 h-3.5" /> Billetter ({tickets.length})</p>
            {tickets.length === 0
              ? <p className="text-slate-500 text-sm text-center py-4">Ingen billetter på dette kortet</p>
              : tickets.map(t => {
                  const ok = t.ticket_category === 'period'
                    ? (t.valid_until && new Date(t.valid_until) >= new Date())
                    : (t.status === 'unused' || t.status === 'active');
                  return (
                    <div key={t.id} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white capitalize text-sm">{t.type} · {t.ticket_category}</p>
                        <p className="text-xs text-slate-500 font-mono">{t.short_code} · <span className={ok ? 'text-green-400' : 'text-slate-500'}>{t.status}</span></p>
                      </div>
                      {mode !== 'tvm' && (
                        <Button size="sm" variant={ok ? 'default' : 'outline'} onClick={() => actOnTicket(t)} className={ok ? 'bg-[#c0392b] hover:bg-[#a93226]' : ''}>
                          {mode === 'inspect' ? 'Valider' : 'Aktiver'}
                        </Button>
                      )}
                    </div>
                  );
                })}
          </div>

          {canSell && (
            <>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1"><Wallet className="w-3.5 h-3.5" /> Fyll på credits</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 200, 500, 1000].map(v => (
                    <button key={v} onClick={() => setTopKr(v)} className={`py-2 rounded-lg text-sm font-bold border ${topKr === v ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700 text-slate-300'}`}>{v}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input type="number" value={topKr} onChange={e => setTopKr(Number(e.target.value))} className="bg-slate-900 border-slate-700 text-white" />
                  <Button onClick={() => topUpMut.mutate()} disabled={topUpMut.isPending} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-1" /> Fyll på</Button>
                </div>
                <p className="text-xs text-slate-500 px-1">{topKr} kr → {topKr} credits på kortet</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1"><TicketIcon className="w-3.5 h-3.5" /> Kjøp billett på kortet</p>
                {!card.customer_id && <p className="text-xs text-amber-400 px-1">Kortet må være knyttet til en konto før kjøp.</p>}
                <div className="flex gap-2 px-1">
                  {[['single', 'Enkelt'], ['period', '30-dager']].map(([v, l]) => (
                    <button key={v} onClick={() => setBuyCat(v)} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${buyCat === v ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700 text-slate-300'}`}>{l}</button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-1 px-1">
                  {TYPES.map(t => (
                    <button key={t.type} onClick={() => setBuyType(t.type)} className={`py-2 rounded-lg text-xs font-medium border ${buyType === t.type ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700 text-slate-300'}`}>{t.label}</button>
                  ))}
                </div>
                <div className="flex justify-between items-center px-1">
                  <p className="text-sm text-slate-300">Pris: <span className="font-bold text-white">{cost} credits</span></p>
                  <Button onClick={() => buyMut.mutate()} disabled={buyMut.isPending || !card.customer_id || cost <= 0} className="bg-[#c0392b] hover:bg-[#a93226]">Kjøp</Button>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 px-1"><Link2 className="w-3.5 h-3.5" /> Knytt til konto</p>
                <div className="flex gap-2 px-1">
                  <Input value={linkPhone} onChange={e => setLinkPhone(e.target.value)} placeholder="Telefonnummer…" className="bg-slate-900 border-slate-700 text-white" />
                  <Button onClick={() => linkMut.mutate()} disabled={linkMut.isPending} variant="outline">Knytt</Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}