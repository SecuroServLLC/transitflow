import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { genShortCode } from '@/utils/customerAuth';
import { toast } from 'sonner';
import { Printer, CheckCircle2, ArrowLeft, Plus, Minus, Layers, Split } from 'lucide-react';
import { printTicket58, printCombined58 } from '@/components/driver/PrintableTicket58';

const TYPES = [
  { type: 'adult', label: 'Voksen', icon: '🧑' },
  { type: 'child', label: 'Barn', icon: '👶' },
  { type: 'senior', label: 'Honnør', icon: '👴' },
  { type: 'student', label: 'Student', icon: '🎓' },
  { type: 'military', label: 'Forsvar', icon: '🪖' },
];

const typeLabel = (t) => TYPES.find(x => x.type === t)?.label || t;
const catLabel = (c) => c === 'period' ? '30-dager' : 'Enkelt';
const MAX_QTY = 9;

export default function DriverSale({ driver }) {
  const [category, setCategory] = useState('single');
  const [cart, setCart] = useState({}); // { adult: 2, child: 1, ... }
  const [mode, setMode] = useState('split'); // 'split' | 'combined'
  const [last, setLast] = useState(null);
  const qc = useQueryClient();

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const setQty = (type, delta) => {
    setCart(prev => {
      const next = Math.min(MAX_QTY, Math.max(0, (prev[type] || 0) + delta));
      const copy = { ...prev };
      if (next <= 0) delete copy[type]; else copy[type] = next;
      return copy;
    });
  };

  const lines = Object.entries(cart).map(([t, q]) => ({ type: t, qty: q, price: priceMap[t]?.[category] || 0 }));
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const totalKr = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const canSell = totalQty > 0 && lines.every(l => l.price > 0);

  const sell = useMutation({
    mutationFn: async () => {
      if (!canSell) throw new Error('Legg til minst én billett');
      const tickets = [];
      for (const line of lines) {
        for (let i = 0; i < line.qty; i++) {
          const ticketId = `TT-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const validUntil = category === 'period'
            ? new Date(Date.now() + 30 * 86400000).toISOString()
            : new Date(Date.now() + 90 * 60000).toISOString();
          const ticket = await base44.entities.Ticket.create({
            ticket_id: ticketId, type: line.type, ticket_category: category,
            credits_paid: line.price, kr_paid: line.price, fees_paid: 0,
            purchase_method: 'cashier', status: 'active',
            qr_token: crypto.randomUUID(), short_code: genShortCode(),
            purchased_at: new Date().toISOString(), activated_at: new Date().toISOString(),
            valid_until: validUntil,
            issued_by: driver?.name || 'Sjåfør',
            customer_name: 'Salg i buss'
          });
          await base44.entities.Transaction.create({
            type: 'purchase', amount: line.price, kr_amount: line.price,
            description: `${typeLabel(line.type)} ${catLabel(category)} (salg i buss)`,
            performed_by: driver?.name || 'Sjåfør', ticket_id: ticketId
          });
          tickets.push(ticket);
        }
      }
      return tickets;
    },
    onSuccess: (tickets) => {
      setLast(tickets);
      setCart({});
      qc.invalidateQueries({ queryKey: ['all-tickets'] });
      if (mode === 'combined') printCombined58(tickets);
      else tickets.forEach(t => printTicket58(t));
    },
    onError: e => toast.error(e.message)
  });

  if (last) {
    return (
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="bg-green-950/40 border-2 border-green-500 rounded-3xl p-6">
          <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-2" />
          <h2 className="text-xl font-black text-green-400">{last.length} billett(er) laget</h2>
          <p className="text-slate-300 mt-2 space-y-1">
            {Object.entries(last.reduce((m, t) => { m[t.type] = (m[t.type]||0)+1; return m; }, {}))
              .map(([t, n]) => <div key={t}>{typeLabel(t)} × {n}</div>)}
          </p>
          <p className="text-3xl font-black mt-2">{last.reduce((s, t) => s + t.kr_paid, 0)} kr</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLast(null)} className="flex-1 h-12 border-slate-700 text-slate-300">
            <ArrowLeft className="w-4 h-4 mr-1" /> Nytt salg
          </Button>
          <Button onClick={() => mode === 'combined' ? printCombined58(last) : last.forEach(t => printTicket58(t))}
            className="flex-1 h-12 bg-[#c0392b] hover:bg-[#a93226]">
            <Printer className="w-4 h-4 mr-1" /> Skriv ut igjen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">Salg i buss</h2>
        <p className="text-slate-500 text-sm">Maks {MAX_QTY} av hver type · 58mm utskrift</p>
      </div>

      <div className="flex gap-2">
        {[['single', '🎫 Enkelt'], ['period', '📅 30-dager']].map(([v, l]) => (
          <button key={v} onClick={() => setCategory(v)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold ${category === v ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-400'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-2">
        {TYPES.map(t => {
          const qty = cart[t.type] || 0;
          const p = priceMap[t.type]?.[category];
          return (
            <div key={t.type} className={`flex items-center gap-3 rounded-xl p-2 ${qty > 0 ? 'bg-slate-800 border border-[#c0392b]/50' : 'bg-slate-800/60'}`}>
              <span className="text-2xl w-8 text-center">{t.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{t.label}</div>
                <div className="text-xs text-slate-400">{p ? `${p} kr` : '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(t.type, -1)} disabled={qty === 0}
                  className="w-9 h-9 rounded-lg bg-slate-700 text-white disabled:opacity-40 flex items-center justify-center">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-7 text-center text-lg font-black">{qty}</span>
                <button onClick={() => setQty(t.type, 1)} disabled={qty >= MAX_QTY || !p}
                  className="w-9 h-9 rounded-lg bg-[#c0392b] text-white disabled:opacity-40 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {[['split', 'Delt', Split], ['combined', 'Samlet', Layers]].map(([v, l, Icon]) => (
          <button key={v} onClick={() => setMode(v)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${mode === v ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-400'}`}>
            <Icon className="w-4 h-4" /> {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center -mt-2">
        {mode === 'split' ? 'Hver billett på egen lapp' : 'Alle billetter på én lapp'}
      </p>

      <div className="bg-[#111] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">{totalQty} billett(er)</span>
          <span className="text-2xl font-black">{totalQty ? `${totalKr} kr` : '—'}</span>
        </div>
        <Button onClick={() => sell.mutate()} disabled={sell.isPending || !canSell}
          className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">
          {sell.isPending ? 'Genererer…' : <><Printer className="w-4 h-4 mr-2" /> Generer & Skriv ut</>}
        </Button>
      </div>
    </div>
  );
}