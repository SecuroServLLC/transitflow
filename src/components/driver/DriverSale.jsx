import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { genShortCode } from '@/utils/customerAuth';
import { toast } from 'sonner';
import { Printer, CheckCircle2, ArrowLeft } from 'lucide-react';
import { printTicket58 } from '@/components/driver/PrintableTicket58';

const TYPES = [
  { type: 'adult', label: 'Voksen', icon: '🧑' },
  { type: 'child', label: 'Barn', icon: '👶' },
  { type: 'senior', label: 'Honnør', icon: '👴' },
  { type: 'student', label: 'Student', icon: '🎓' },
  { type: 'military', label: 'Forsvar', icon: '🪖' },
];

const typeLabel = (t) => TYPES.find(x => x.type === t)?.label || t;
const catLabel = (c) => c === 'period' ? '30-dagers' : 'Enkelt';

export default function DriverSale({ driver }) {
  const [type, setType] = useState('adult');
  const [category, setCategory] = useState('single');
  const [last, setLast] = useState(null);
  const qc = useQueryClient();

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });
  const price = priceMap[type]?.[category] || 0;

  const sell = useMutation({
    mutationFn: async () => {
      if (!price) throw new Error('Pris ikke satt for denne billettypen');
      const ticketId = `TT-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const validUntil = category === 'period'
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : new Date(Date.now() + 90 * 60000).toISOString();
      const ticket = await base44.entities.Ticket.create({
        ticket_id: ticketId, type, ticket_category: category,
        credits_paid: price, kr_paid: price, fees_paid: 0,
        purchase_method: 'cashier', status: 'active',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        issued_by: driver?.name || 'Sjåfør',
        customer_name: 'Salg i buss'
      });
      await base44.entities.Transaction.create({
        type: 'purchase', amount: price, kr_amount: price,
        description: `${typeLabel(type)} ${catLabel(category)} (salg i buss)`,
        performed_by: driver?.name || 'Sjåfør', ticket_id: ticketId
      });
      return ticket;
    },
    onSuccess: (ticket) => {
      setLast(ticket);
      qc.invalidateQueries({ queryKey: ['all-tickets'] });
      printTicket58(ticket);
    },
    onError: e => toast.error(e.message)
  });

  if (last) {
    return (
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="bg-green-950/40 border-2 border-green-500 rounded-3xl p-6">
          <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-2" />
          <h2 className="text-xl font-black text-green-400">Billett laget</h2>
          <p className="text-slate-300 capitalize mt-1">{typeLabel(last.type)} · {catLabel(last.ticket_category)}</p>
          <p className="text-3xl font-black mt-2">{last.kr_paid} kr</p>
          <p className="text-slate-400 font-mono tracking-widest text-lg mt-2">{last.short_code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLast(null)} className="flex-1 h-12 border-slate-700 text-slate-300">
            <ArrowLeft className="w-4 h-4 mr-1" /> Ny salg
          </Button>
          <Button onClick={() => printTicket58(last)} className="flex-1 h-12 bg-[#c0392b] hover:bg-[#a93226]">
            <Printer className="w-4 h-4 mr-1" /> Skriv ut
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">Salg i buss</h2>
        <p className="text-slate-500 text-sm">Generer og skriv ut 58mm billett</p>
      </div>

      <div className="flex gap-2">
        {[['single', '🎫 Enkelt'], ['period', '📅 30-dager']].map(([v, l]) => (
          <button key={v} onClick={() => setCategory(v)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold ${category === v ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-400'}`}>{l}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TYPES.map(t => (
          <button key={t.type} onClick={() => setType(t.type)}
            className={`py-3 rounded-xl flex flex-col items-center gap-1 ${type === t.type ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-300'}`}>
            <span className="text-2xl">{t.icon}</span>
            <span className="text-xs font-bold">{t.label}</span>
            <span className="text-xs opacity-70">{priceMap[t.type]?.[category] ? `${priceMap[t.type][category]} kr` : '—'}</span>
          </button>
        ))}
      </div>

      <div className="bg-[#111] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Total</span>
          <span className="text-2xl font-black">{price ? `${price} kr` : '—'}</span>
        </div>
        <Button onClick={() => sell.mutate()} disabled={sell.isPending || !price}
          className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">
          {sell.isPending ? 'Genererer…' : <><Printer className="w-4 h-4 mr-2" /> Generer & Skriv ut</>}
        </Button>
      </div>
    </div>
  );
}