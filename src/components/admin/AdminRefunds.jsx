import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Search, Phone, Ticket as TicketIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRefunds() {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null); // { customer, ticket? }
  const [searching, setSearching] = useState(false);
  const qc = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ['refund-tickets', found?.customer?.id],
    queryFn: () => found?.customer ? base44.entities.Ticket.filter({ customer_id: found.customer.id }) : [],
    enabled: !!found?.customer?.id
  });

  const { data: refundedIds = [] } = useQuery({
    queryKey: ['refund-txns'],
    queryFn: async () => {
      const list = await base44.entities.Transaction.filter({ type: 'refund' });
      return list.map(t => t.ticket_id).filter(Boolean);
    }
  });

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      // 1) phone lookup (numeric input)
      if (/^\d+$/.test(q)) {
        const byPhone = await base44.entities.Customer.filter({ phone: q });
        if (byPhone.length) { setFound({ customer: byPhone[0], ticket: null }); return; }
      }
      // 2) ticket shortcode lookup
      const byCode = await base44.entities.Ticket.filter({ short_code: q.toUpperCase() });
      if (byCode.length) {
        const ticket = byCode[0];
        let customer = null;
        if (ticket.customer_id) {
          const byId = await base44.entities.Customer.filter({ id: ticket.customer_id });
          if (byId.length) customer = byId[0];
        }
        if (customer) { setFound({ customer, ticket }); return; }
      }
      toast.error('Kunde eller billett ikke funnet');
      setFound(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const refund = useMutation({
    mutationFn: async (ticket) => {
      const refundCredits = ticket.credits_paid || ticket.kr_paid || 0;
      if (refundCredits <= 0) throw new Error('Billetten har ingen verdi å refundere');
      if (refundedIds.includes(ticket.id)) throw new Error('Billetten er allerede refundert');
      const fresh = await base44.entities.Customer.filter({ id: found.customer.id });
      const cur = fresh.length ? (fresh[0].credits || 0) : (found.customer.credits || 0);
      await base44.entities.Customer.update(found.customer.id, { credits: cur + refundCredits });
      await base44.entities.Ticket.update(ticket.id, {
        status: 'expired',
        notes: `Refundert ${new Date().toLocaleString('nb-NO')} → ${refundCredits} cr`
      });
      await base44.entities.Transaction.create({
        customer_id: found.customer.id,
        customer_name: found.customer.name,
        type: 'refund',
        amount: refundCredits,
        ticket_id: ticket.id,
        description: `Refusjon billett ${ticket.short_code} → ${refundCredits} cr`,
        performed_by: 'admin'
      });
      return refundCredits;
    },
    onSuccess: async (credits) => {
      qc.invalidateQueries({ queryKey: ['refund-txns'] });
      qc.invalidateQueries({ queryKey: ['refund-tickets', found?.customer?.id] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['admin-transactions'] });
      const fresh = await base44.entities.Customer.filter({ id: found.customer.id });
      if (fresh.length) setFound(f => ({ ...f, customer: fresh[0] }));
      toast.success(`${credits} credits refundert`);
    },
    onError: e => toast.error(e.message)
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Refusjon</h2>
      </div>
      <p className="text-gray-500 text-sm mb-6">Kunden oppgir telefonnummer eller billettkode — refunderes alltid til credits, uansett betalingsmetode.</p>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Telefonnummer eller billettkode…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          className="max-w-sm"
        />
        <Button onClick={search} disabled={searching} variant="outline">
          <Search className="w-4 h-4 mr-2" /> {searching ? 'Søker…' : 'Søk'}
        </Button>
        {found && <Button onClick={() => { setQuery(''); setFound(null); }} variant="ghost" className="text-gray-500">Tøm</Button>}
      </div>

      {found && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <div>
            <p className="font-bold">{found.customer.name}</p>
            <p className="text-sm text-gray-500">{found.customer.phone || '—'} · {found.customer.email || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-blue-700">{found.customer.credits || 0}</p>
            <p className="text-xs text-gray-400">credits</p>
          </div>
        </div>
      )}

      {found && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Billettkode', 'Type', 'Kategori', 'Betalte credits', 'Betalt kr', 'Status', 'Handling'].map(h =>
                <th key={h} className="text-left px-3 py-3 text-gray-600 font-medium text-xs">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Ingen billetter på denne kunden</td></tr>
              )}
              {tickets.map(t => {
                const isRefunded = refundedIds.includes(t.id);
                const highlight = found.ticket && t.id === found.ticket.id;
                return (
                  <tr key={t.id} className={`border-b border-gray-100 last:border-0 ${highlight ? 'bg-amber-50' : ''} ${isRefunded ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{t.short_code || '—'}</code></td>
                    <td className="px-3 py-3 capitalize">{t.type}</td>
                    <td className="px-3 py-3 capitalize">{t.ticket_category}</td>
                    <td className="px-3 py-3 font-medium">{t.credits_paid || 0} cr</td>
                    <td className="px-3 py-3">{t.kr_paid ? `${t.kr_paid} kr` : '—'}</td>
                    <td className="px-3 py-3 capitalize text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${t.status === 'expired' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{t.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      {isRefunded ? (
                        <span className="text-xs text-gray-400 italic">Refundert</span>
                      ) : (
                        <Button size="sm" variant="outline"
                          onClick={() => refund.mutate(t)}
                          disabled={refund.isPending}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Refunder til credits
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!found && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="flex justify-center gap-4 mb-3 text-gray-300">
            <Phone className="w-8 h-8" /><TicketIcon className="w-8 h-8" />
          </div>
          <p className="font-medium text-gray-500">Søk på telefon eller billettkode for å refundere</p>
        </div>
      )}
    </div>
  );
}