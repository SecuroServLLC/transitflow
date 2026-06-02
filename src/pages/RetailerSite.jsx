import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, ShoppingBag, History, Printer, LogOut, TrendingUp } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';
import { toast } from 'sonner';

const TYPES = [
  { value: 'adult', label: 'Adult', price: 100 },
  { value: 'child', label: 'Child', price: 50 },
  { value: 'student', label: 'Student', price: 70 },
  { value: 'senior', label: 'Senior', price: 60 },
];

export default function RetailerSite() {
  const [retailer, setRetailer] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', phone: '' });
  const [ticketType, setTicketType] = useState('adult');
  const [category, setCategory] = useState('single');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [issuedTicket, setIssuedTicket] = useState(null);
  const [tab, setTab] = useState('sell');
  const qc = useQueryClient();

  const { data: retailers = [] } = useQuery({
    queryKey: ['retailers'],
    queryFn: () => base44.entities.Retailer.list(),
    enabled: !retailer
  });

  const { data: myTickets = [] } = useQuery({
    queryKey: ['retailer-tickets', retailer?.id],
    queryFn: () => base44.entities.Ticket.filter({ purchase_method: 'retailer', issued_by: retailer?.name }),
    enabled: !!retailer && tab === 'ledger'
  });

  const login = () => {
    const found = retailers.find(r =>
      r.email?.toLowerCase() === loginForm.email.trim().toLowerCase() &&
      r.phone === loginForm.phone.trim() &&
      r.is_active !== false
    );
    if (found) { setRetailer(found); toast.success(`Welcome, ${found.name}!`); }
    else toast.error('Retailer not found or inactive');
  };

  const selectedType = TYPES.find(t => t.value === ticketType);
  const faceValue = selectedType?.price || 100;
  const commission = retailer?.commission_rate || 5;
  const settlementPrice = +(faceValue * (1 - commission / 100)).toFixed(2);

  const sellMutation = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const uniqueId = `TT-RTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const ticket = await base44.entities.Ticket.create({
        ticket_id: uniqueId,
        type: ticketType,
        ticket_category: category,
        credits_paid: faceValue,
        kr_paid: settlementPrice,
        fees_paid: 0,
        purchase_method: 'retailer',
        status: 'unused',
        qr_token: crypto.randomUUID(),
        short_code: code,
        purchased_at: new Date().toISOString(),
        valid_until: category === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        customer_name: recipientName || 'Retail Customer',
        customer_phone: recipientPhone,
        issued_by: retailer.name,
        notes: `Sold by ${retailer.name}. Face: ${faceValue}kr. Settlement: ${settlementPrice}kr`
      });
      await base44.entities.Transaction.create({
        customer_name: retailer.name,
        type: 'purchase',
        amount: faceValue,
        kr_amount: settlementPrice,
        description: `Retail ticket by ${retailer.name}: ${uniqueId}`,
        performed_by: 'retailer',
        ticket_id: uniqueId
      });
      return ticket;
    },
    onSuccess: t => {
      setIssuedTicket(t);
      setRecipientName(''); setRecipientPhone('');
      qc.invalidateQueries({ queryKey: ['retailer-tickets'] });
    }
  });

  const printTicket = (t) => {
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`<!DOCTYPE html><html><head><title>LST Ticket</title>
    <style>body{font-family:monospace;padding:24px;max-width:360px;background:#fff}
    .logo{font-weight:900;font-size:20px;text-align:center;margin-bottom:4px}
    .red{color:#c0392b}.divider{border-top:2px dashed #ccc;margin:12px 0}
    .big{text-align:center;font-size:36px;font-weight:900;letter-spacing:8px;margin:16px 0}
    .row{display:flex;justify-content:space-between;font-size:12px;margin:4px 0}
    .badge{background:#0a0a0a;color:#fff;text-align:center;padding:8px;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px}
    .footer{text-align:center;font-size:10px;color:#aaa;margin-top:16px}</style></head><body>
    <div class="logo"><span class="red">LOS SANTOS</span> TRANSIT</div>
    <div class="divider"></div>
    <div class="badge">${t.type} — ${t.ticket_category}</div>
    <div class="big">${t.short_code}</div>
    <div class="divider"></div>
    <div class="row"><span>Ticket ID</span><span>${t.ticket_id}</span></div>
    <div class="row"><span>Passenger</span><span>${t.customer_name}</span></div>
    <div class="row"><span>Issued</span><span>${new Date(t.purchased_at).toLocaleString()}</span></div>
    <div class="row"><span>Sold by</span><span>${t.issued_by}</span></div>
    <div class="row"><span>Face Value</span><span>${faceValue} kr</span></div>
    <div class="divider"></div>
    <div class="footer">Valid for one use. Present to inspector on demand.<br/>Los Santos Transit © 2026</div>
    </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 300);
  };

  if (!retailer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] border border-slate-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
          <div className="text-center">
            <LSTLogo size={56} className="mx-auto mb-4" />
            <h1 className="text-xl font-black text-white">Retail Terminal</h1>
            <p className="text-slate-500 text-sm mt-1">Authorised Retailer Login</p>
          </div>
          <div className="space-y-3">
            <div><Label className="text-slate-400 text-xs">Merchant Email</Label><Input placeholder="partner@shop.no" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white" /></div>
            <div><Label className="text-slate-400 text-xs">Merchant Phone</Label><Input placeholder="Phone on file" value={loginForm.phone} onChange={e => setLoginForm(f => ({ ...f, phone: e.target.value }))} onKeyDown={e => e.key === 'Enter' && login()} className="bg-[#0a0a0a] border-slate-700 text-white" /></div>
            <Button onClick={login} className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">Access Terminal</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalSales = myTickets.length;
  const totalRevenue = myTickets.reduce((s, t) => s + (t.kr_paid || 0), 0);
  const totalFaceValue = myTickets.reduce((s, t) => s + (t.credits_paid || 0), 0);
  const totalCommission = totalFaceValue - totalRevenue;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="bg-[#111] border-b border-[#c0392b]/30 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LSTLogo size={36} />
          <div>
            <p className="font-bold">{retailer.name}</p>
            <p className="text-xs text-slate-500">{commission}% commission · Authorised Retailer</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setRetailer(null)} className="text-slate-400 hover:text-red-400">
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="max-w-4xl mx-auto w-full p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2">
          {[['sell', '🎫 Sell Ticket'], ['ledger', '📊 Sales Ledger']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-[#c0392b] text-white' : 'bg-[#111] text-slate-400 hover:text-white border border-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'sell' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Issue Form */}
            <div className="bg-[#111] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#c0392b]" /> Issue Ticket</h3>
              <div className="flex gap-2">
                {['single', 'period'].map(v => (
                  <button key={v} onClick={() => setCategory(v)}
                    className={`flex-1 py-2.5 border-2 rounded-xl text-xs font-bold capitalize transition-all ${category === v ? 'border-[#c0392b] bg-[#c0392b]/10 text-[#e74c3c]' : 'border-slate-700 text-slate-400'}`}>
                    {v === 'single' ? '🎫 Single' : '📅 30-Day'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setTicketType(t.value)}
                    className={`py-2.5 border-2 rounded-xl text-xs font-medium transition-all ${ticketType === t.value ? 'border-[#c0392b] bg-[#c0392b]/10 text-[#e74c3c]' : 'border-slate-700 text-slate-400'}`}>
                    {t.label} — {t.price} kr
                  </button>
                ))}
              </div>
              <div><Label className="text-xs text-slate-400">Customer Name</Label><Input value={recipientName} onChange={e => setRecipientName(e.target.value)} className="bg-[#0a0a0a] border-slate-700 text-white text-sm mt-1" /></div>
              <div><Label className="text-xs text-slate-400">Customer Phone</Label><Input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="bg-[#0a0a0a] border-slate-700 text-white text-sm mt-1" /></div>

              <div className="bg-[#0a0a0a] rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Face Value</span><span className="font-bold">{faceValue} kr</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Your Cost ({commission}% off)</span><span className="font-bold text-green-400">{settlementPrice} kr</span></div>
                <div className="flex justify-between border-t border-slate-800 pt-1 mt-1"><span className="text-slate-400">Your Commission</span><span className="font-bold text-[#c0392b]">+{(faceValue - settlementPrice).toFixed(2)} kr</span></div>
              </div>

              <Button onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending} className="w-full bg-[#c0392b] hover:bg-[#a93226] font-bold h-12">
                Generate & Print Ticket
              </Button>
            </div>

            {/* Issued Ticket */}
            <div className="bg-[#111] border border-slate-800 rounded-2xl p-5 space-y-4">
              {issuedTicket ? (
                <>
                  <h3 className="font-bold text-green-400 flex items-center gap-2">✅ Ticket Ready to Print</h3>
                  <div className="bg-[#0a0a0a] border border-dashed border-slate-700 rounded-xl p-5 text-center space-y-2">
                    <p className="text-[10px] text-slate-500 tracking-widest uppercase">Short Code</p>
                    <p className="font-mono font-black text-4xl tracking-widest text-white">{issuedTicket.short_code}</p>
                    <p className="text-xs text-slate-500 font-mono">{issuedTicket.ticket_id}</p>
                    <p className="text-xs capitalize text-slate-400">{issuedTicket.type} — {issuedTicket.ticket_category}</p>
                    <p className="text-xs text-slate-500">{issuedTicket.customer_name}</p>
                  </div>
                  <Button onClick={() => printTicket(issuedTicket)} className="w-full bg-slate-800 hover:bg-slate-700 font-bold">
                    <Printer className="w-4 h-4 mr-2" /> Print Receipt Ticket
                  </Button>
                  <Button variant="outline" onClick={() => setIssuedTicket(null)} className="w-full border-slate-700 text-slate-300">Issue Another</Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-600 text-center">
                  <Store className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Issued tickets will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'ledger' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[['Total Tickets', totalSales], ['Revenue Settled', `${totalRevenue.toFixed(0)} kr`], ['Commission Earned', `${totalCommission.toFixed(0)} kr`]].map(([k, v]) => (
                <div key={k} className="bg-[#111] border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="text-xs text-slate-500 mt-1">{k}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#111] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#0a0a0a] border-b border-slate-800">
                  <tr>{['Ticket ID', 'Type', 'Customer', 'Settlement', 'Date'].map(h => <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {myTickets.map(t => (
                    <tr key={t.id} className="border-b border-slate-900">
                      <td className="px-4 py-2.5 font-mono text-slate-300">{t.ticket_id}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-400">{t.type}</td>
                      <td className="px-4 py-2.5 text-slate-400">{t.customer_name || '—'}</td>
                      <td className="px-4 py-2.5 text-green-400 font-bold">{t.kr_paid} kr</td>
                      <td className="px-4 py-2.5 text-slate-500">{new Date(t.purchased_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {myTickets.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">No sales yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}