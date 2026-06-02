import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogOut, Search, Zap, ShoppingBag, History } from 'lucide-react';
import { genShortCode } from '@/utils/customerAuth';

const TYPES = ['adult','child','senior','student','military'];

export default function CashierSite() {
  const [account, setAccount] = useState(null);
  const [loginForm, setLoginForm] = useState({ username:'', password:'' });
  const [tab, setTab] = useState('topup');
  const [search, setSearch] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [topUpAmt, setTopUpAmt] = useState(2000);
  const [ticketType, setTicketType] = useState('adult');
  const [ticketCategory, setTicketCategory] = useState('single');
  const [buyForPhone, setBuyForPhone] = useState('');
  const qc = useQueryClient();

  const { data: cashiers = [] } = useQuery({ queryKey: ['cashiers'], queryFn: () => base44.entities.CashierAccount.list(), enabled: !account });
  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list(), enabled: !!account });
  const { data: txns = [] } = useQuery({ queryKey: ['cashier-txns'], queryFn: () => base44.entities.Transaction.list('-created_date', 50), enabled: !!account && tab === 'history' });

  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const login = () => {
    const c = cashiers.find(c => c.username === loginForm.username && c.password === loginForm.password && c.is_active);
    if (!c) { toast.error('Invalid credentials or account inactive'); return; }
    setAccount(c);
  };

  const findCustomer = async () => {
    if (!search.trim()) return;
    const byPhone = await base44.entities.Customer.filter({ phone: search.trim() });
    if (byPhone.length > 0) { setFoundCustomer(byPhone[0]); return; }
    const byEmail = await base44.entities.Customer.filter({ email: search.toLowerCase().trim() });
    if (byEmail.length > 0) { setFoundCustomer(byEmail[0]); return; }
    toast.error('Customer not found');
    setFoundCustomer(null);
  };

  const doTopUp = useMutation({
    mutationFn: async () => {
      if (!foundCustomer) throw new Error('Find customer first');
      const bonus = Math.round(topUpAmt * 0.4);
      const total = topUpAmt + bonus;
      const updated = await base44.entities.Customer.update(foundCustomer.id, { credits: (foundCustomer.credits||0) + total });
      await base44.entities.Transaction.create({ customer_id: foundCustomer.id, customer_name: foundCustomer.name, type: 'topup', amount: total, kr_amount: topUpAmt, description: `Cashier top-up ${topUpAmt}kr (+40% = ${bonus})`, performed_by: account.name });
      return updated;
    },
    onSuccess: updated => { setFoundCustomer(updated); qc.invalidateQueries({queryKey:['cashier-txns']}); toast.success(`Top up done! ${topUpAmt}kr → ${topUpAmt + Math.round(topUpAmt*0.4)} credits`); }
  });

  const doBuy = useMutation({
    mutationFn: async () => {
      const phone = (buyForPhone || foundCustomer?.phone || '').trim();
      let cust = foundCustomer;
      if (!cust && phone) {
        const res = await base44.entities.Customer.filter({ phone });
        cust = res[0] || null;
      }
      const cost = priceMap[ticketType]?.[ticketCategory];
      if (!cost) throw new Error('Price not set');
      const validUntil = ticketCategory === 'period' ? new Date(Date.now() + 30*24*60*60*1000).toISOString() : null;
      const ticket = await base44.entities.Ticket.create({
        type: ticketType, ticket_category: ticketCategory, credits_paid: cost,
        purchase_method: 'cashier', status: ticketCategory==='period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: cust?.id||'', customer_name: cust?.name||'Walk-in',
        customer_phone: cust?.phone||phone||''
      });
      if (cust) {
        const newCredits = (cust.credits||0) - cost;
        if (newCredits < 0) throw new Error('Customer has insufficient credits. Top up first.');
        await base44.entities.Customer.update(cust.id, { credits: newCredits });
        if (cust.id === foundCustomer?.id) setFoundCustomer({ ...cust, credits: newCredits });
      }
      await base44.entities.Transaction.create({ customer_id: cust?.id||'', customer_name: cust?.name||'Walk-in', type: 'purchase', amount: cost, description: `Cashier: ${ticketType} ${ticketCategory}`, performed_by: account.name, ticket_id: ticket.id });
      return ticket;
    },
    onSuccess: ticket => { qc.invalidateQueries({queryKey:['cashier-txns']}); toast.success(`Ticket issued! Code: ${ticket.short_code}`); }
  });

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6"><div className="text-4xl mb-2">💼</div><h1 className="text-xl font-bold">Cashier Login</h1></div>
          <div className="space-y-3">
            <div><Label>Username</Label><Input value={loginForm.username} onChange={e=>setLoginForm(f=>({...f,username:e.target.value}))} /></div>
            <div><Label>Password</Label><Input type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&login()} /></div>
            <Button onClick={login} className="w-full bg-gray-900 hover:bg-gray-800 h-11">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
        <div><h1 className="font-bold text-lg">💼 Cashier Panel</h1><p className="text-gray-400 text-sm">{account.name}</p></div>
        <Button variant="ghost" onClick={() => setAccount(null)} className="text-gray-400 hover:text-red-400"><LogOut className="w-4 h-4 mr-2" />Logout</Button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Tab Nav */}
        <div className="flex gap-2">
          {[['topup','💰 Top Up'],['sell','🎫 Sell Ticket'],['history','📋 History']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{label}</button>
          ))}
        </div>

        {/* Customer Finder (shared) */}
        {(tab === 'topup' || tab === 'sell') && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Find Customer</h3>
            <div className="flex gap-2">
              <Input placeholder="Phone or email…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&findCustomer()} className="flex-1" />
              <Button onClick={findCustomer} className="bg-gray-800 hover:bg-gray-700"><Search className="w-4 h-4 mr-2" />Find</Button>
            </div>
            {foundCustomer && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{foundCustomer.name}</p>
                  <p className="text-sm text-gray-500">{foundCustomer.phone} · {foundCustomer.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-blue-700">{foundCustomer.credits||0}</p>
                  <p className="text-xs text-gray-400">credits</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Up */}
        {tab === 'topup' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Top Up Credits</h3>
            <div className="grid grid-cols-4 gap-2">
              {[500,1000,2000,5000].map(v => (
                <button key={v} onClick={() => setTopUpAmt(v)}
                  className={`py-3 border-2 rounded-xl font-bold transition-all ${topUpAmt===v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{v} kr</button>
              ))}
            </div>
            <div><Label>Custom Amount (kr)</Label><Input type="number" value={topUpAmt} onChange={e=>setTopUpAmt(Number(e.target.value))} /></div>
            {topUpAmt > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                <p className="text-green-700"><span className="font-bold">{topUpAmt} kr</span> → <span className="font-bold text-lg">{topUpAmt + Math.round(topUpAmt*0.4)} credits</span></p>
                <p className="text-green-500 text-xs">Includes 40% bonus</p>
              </div>
            )}
            <Button onClick={() => doTopUp.mutate()} disabled={!foundCustomer || doTopUp.isPending} className="w-full h-12 bg-green-600 hover:bg-green-700">
              <Zap className="w-4 h-4 mr-2" /> Process Top Up
            </Button>
          </div>
        )}

        {/* Sell Ticket */}
        {tab === 'sell' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Sell Ticket</h3>
            <div>
              <Label>Passenger for (phone, optional)</Label>
              <Input placeholder="Leave blank to use found customer" value={buyForPhone} onChange={e=>setBuyForPhone(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {[['single','🎫 Single'],['period','📅 30-Day']].map(([v,l]) => (
                <button key={v} onClick={() => setTicketCategory(v)}
                  className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-semibold transition-all ${ticketCategory===v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{l}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TYPES.map(t => {
                const cost = priceMap[t]?.[ticketCategory];
                return (
                  <button key={t} onClick={() => setTicketType(t)}
                    className={`py-2 border-2 rounded-xl text-xs font-medium transition-all ${ticketType===t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                    <span className="capitalize">{t}</span><br/><span className="text-gray-400">{cost||'—'}cr</span>
                  </button>
                );
              })}
            </div>
            {priceMap[ticketType]?.[ticketCategory] && (
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 font-medium">
                Cost: <span className="text-lg font-bold">{priceMap[ticketType][ticketCategory]} credits</span>
                {foundCustomer && <span className="text-blue-400 ml-2">(deducted from {foundCustomer.name})</span>}
              </div>
            )}
            <Button onClick={() => doBuy.mutate()} disabled={doBuy.isPending} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
              <ShoppingBag className="w-4 h-4 mr-2" /> Issue Ticket
            </Button>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-700">Recent Transactions</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Customer','Type','Amount','Description','Time'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{t.customer_name||'—'}</td>
                    <td className="px-4 py-3 capitalize"><span className={`px-2 py-1 rounded-full text-xs font-bold ${t.type==='topup' ? 'bg-green-100 text-green-700' : t.type==='purchase' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.type}</span></td>
                    <td className="px-4 py-3 font-bold">{t.amount} cr</td>
                    <td className="px-4 py-3 text-gray-500">{t.description}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_date).toLocaleString()}</td>
                  </tr>
                ))}
                {txns.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}