import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CreditCard, Plus, Printer, Wallet, Search, AlertCircle } from 'lucide-react';

function genCardNumber() {
  let n = '';
  for (let i = 0; i < 10; i++) n += Math.floor(Math.random() * 10);
  return n;
}

export default function TransitCardPanel({ customer, onRefresh }) {
  const [addNumber, setAddNumber] = useState('');
  const [loadAmount, setLoadAmount] = useState('');
  const [activeCardId, setActiveCardId] = useState(null);
  const qc = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['transit-cards', customer.id],
    queryFn: () => base44.entities.TransitCard.filter({ customer_id: customer.id })
  });

  const activeCard = cards.find(c => c.id === activeCardId) || null;

  const generateMutation = useMutation({
    mutationFn: async () => {
      let number = genCardNumber();
      const existing = await base44.entities.TransitCard.filter({ card_number: number });
      if (existing.length) number = genCardNumber() + Date.now().toString().slice(-4);
      return base44.entities.TransitCard.create({
        card_number: number,
        customer_id: customer.id,
        customer_name: customer.name,
        status: 'active',
        balance_credits: 0,
        is_registered: true
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transit-cards', customer.id] }); toast.success('Transit-kort opprettet'); }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const num = addNumber.trim();
      if (!/^\d{10}$/.test(num)) throw new Error('Kortnummer må være 10 siffer');
      const list = await base44.entities.TransitCard.filter({ card_number: num });
      if (!list.length) throw new Error('Kortet finnes ikke');
      const card = list[0];
      if (card.is_registered && card.customer_id && card.customer_id !== customer.id) {
        throw new Error('Kortet er allerede registrert til en annen kunde');
      }
      return base44.entities.TransitCard.update(card.id, {
        customer_id: customer.id, customer_name: customer.name, is_registered: true, status: 'active'
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transit-cards', customer.id] }); toast.success('Kort lagt til'); setAddNumber(''); }
  });

  const loadMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(loadAmount);
      if (!amt || amt <= 0) throw new Error('Ugyldig beløp');
      if (!activeCard) throw new Error('Velg et kort');
      if ((customer.credits || 0) < amt) throw new Error('Ikke nok credits på kontoen');
      await base44.entities.TransitCard.update(activeCard.id, { balance_credits: (activeCard.balance_credits || 0) + amt });
      await base44.entities.Customer.update(customer.id, { credits: (customer.credits || 0) - amt });
      await base44.entities.Transaction.create({
        customer_id: customer.id, customer_name: customer.name, type: 'purchase', amount: amt,
        description: `Lastet transit-kort ${activeCard.card_number}`, performed_by: 'web'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transit-cards', customer.id] });
      onRefresh();
      setLoadAmount('');
      toast.success('Credits lastet på kort');
    }
  });

  const printCard = (card) => {
    const w = window.open('', '_blank', 'width=620,height=440');
    if (!w) { toast.error('Tillat pop-up for å skrive ut'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Transit-kort ${card.card_number}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f3f4f6; }
  .sheet { width: 340px; }
  .card { border: 2px dashed #9ca3af; border-radius: 18px; padding: 26px 22px; text-align: center; background: #fff; }
  .logo { font-weight: 900; font-size: 20px; letter-spacing: 2px; color: #111; }
  .sub { color: #c0392b; font-weight: 900; letter-spacing: 3px; font-size: 12px; margin-top: 2px; }
  .num { font-family: monospace; font-size: 24px; letter-spacing: 4px; margin: 22px 0 6px; color: #111; }
  .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .name { font-weight: bold; margin-top: 14px; color: #111; }
  .balance { margin-top: 12px; font-size: 14px; color: #374151; }
  .foot { margin-top: 10px; color: #9ca3af; font-size: 10px; }
</style></head><body>
<div class="sheet">
  <div class="card">
    <div class="logo">LOS SANTOS</div>
    <div class="sub">TRANSIT</div>
    <div class="num">${card.card_number}</div>
    <div class="label">Kortnummer</div>
    <div class="name">${card.customer_name || customer.name || ''}</div>
    <div class="balance">Saldo: ${card.balance_credits || 0} credits</div>
    <div class="foot">Fysisk transit-kort · skriv ut og klipp ut</div>
  </div>
</div>
<script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`);
    w.document.close();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Transit-kort</h2>
        <p className="text-gray-500 mt-1">Fysisk kort — last credits, skriv ut som papirark</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">{customer.credits || 0} credits</span>
            <span className="text-gray-400 text-sm">på konto</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="bg-[#c0392b] hover:bg-[#a93226]">
              <Plus className="w-4 h-4 mr-1" /> Generer nytt kort
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Label className="text-xs text-gray-500">Legg til eksisterende kort</Label>
          <div className="flex gap-2 mt-1">
            <Input placeholder="10-sifret kortnummer" value={addNumber} onChange={e => setAddNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className="font-mono tracking-widest" />
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} variant="outline">
              <Search className="w-4 h-4 mr-1" /> Legg til
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Dine transit-kort</h3>
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">Ingen transit-kort enda</p>
            <p className="text-sm mt-1">Generer et nytt kort eller legg til et som finnes fra før</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {cards.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${activeCardId === c.id ? 'border-[#c0392b]' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#0a0a0a] text-white rounded-lg w-10 h-10 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
                    <div>
                      <p className="font-mono font-bold text-gray-900 tracking-widest">{c.card_number}</p>
                      <p className="text-xs text-gray-400">{c.status === 'active' ? 'Aktiv' : c.status}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{c.balance_credits || 0} cr</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printCard(c)}><Printer className="w-4 h-4 mr-1" /> Skriv ut</Button>
                  <Button size="sm" onClick={() => setActiveCardId(c.id)} variant={activeCardId === c.id ? 'default' : 'outline'}>Last credits</Button>
                </div>
                {activeCardId === c.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <Label className="text-xs text-gray-500">Beløp (credits) å laste på kortet</Label>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="f.eks. 100" value={loadAmount} onChange={e => setLoadAmount(e.target.value)} />
                      <Button onClick={() => loadMutation.mutate()} disabled={loadMutation.isPending} className="bg-[#c0392b] hover:bg-[#a93226]">Last</Button>
                    </div>
                    {(customer.credits || 0) <= 0 && (
                      <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Ingen credits på konto — fyll på i profilen først</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(addMutation.isError || loadMutation.isError || generateMutation.isError) && (
        <p className="text-red-500 text-sm text-center">{addMutation.error?.message || loadMutation.error?.message || generateMutation.error?.message}</p>
      )}
    </div>
  );
}