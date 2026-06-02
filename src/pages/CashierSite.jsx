import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogOut, Search, Zap, ShoppingBag, History, Printer } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';
import { genShortCode, genTicketId } from '@/utils/customerAuth';

const TYPES = ['adult','child','senior','student','military'];

function TicketPrint({ ticket, fees, onClose }) {
  const printRef = useRef();
  const doPrint = () => {
    const w = window.open('', '_blank', 'width=420,height=620');
    w.document.write(`<!DOCTYPE html><html><head><title>Ticket ${ticket.ticket_id}</title>
    <style>
      body { font-family: monospace; padding: 24px; max-width: 380px; margin: 0 auto; background: #fff; }
      .logo { font-size: 22px; font-weight: 900; text-align: center; letter-spacing: -1px; margin-bottom: 4px; }
      .subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 20px; }
      .divider { border-top: 2px dashed #ccc; margin: 14px 0; }
      .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
      .label { color: #666; }
      .value { font-weight: bold; }
      .big { text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 6px; margin: 18px 0 8px; }
      .tid { text-align: center; font-size: 11px; color: #888; margin-bottom: 18px; }
      .type-badge { text-align: center; background: #111; color: #fff; padding: 8px 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
      .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 20px; }
      .fee-row { display: flex; justify-content: space-between; font-size: 11px; color: #888; }
    </style></head><body>
    <div class="logo">🚌 TransitTicket</div>
    <div class="subtitle">Official Travel Document</div>
    <div class="divider"></div>
    <div class="type-badge">${ticket.type} — ${ticket.ticket_category}</div>
    <div class="big">${ticket.short_code}</div>
    <div class="tid">Ticket ID: ${ticket.ticket_id}</div>
    <div class="divider"></div>
    <div class="row"><span class="label">Passenger</span><span class="value">${ticket.customer_name || 'Walk-in'}</span></div>
    ${ticket.customer_phone ? `<div class="row"><span class="label">Phone</span><span class="value">${ticket.customer_phone}</span></div>` : ''}
    <div class="row"><span class="label">Issued</span><span class="value">${new Date(ticket.purchased_at).toLocaleString('nb-NO')}</span></div>
    ${ticket.valid_until ? `<div class="row"><span class="label">Valid Until</span><span class="value">${new Date(ticket.valid_until).toLocaleDateString('nb-NO')}</span></div>` : ''}
    <div class="row"><span class="label">Credits Deducted</span><span class="value">${ticket.credits_paid} cr</span></div>
    <div class="divider"></div>
    ${fees.length > 0 ? `<div class="row"><span class="label" style="font-size:11px">Fees / Surcharges</span></div>
    ${fees.map(f => `<div class="fee-row"><span>${f.name}</span><span>${f.amount_kr > 0 ? '+'+f.amount_kr+' kr' : ''} ${f.amount_percent > 0 ? '+'+f.amount_percent+'%' : ''}</span></div>`).join('')}
    <div class="divider"></div>` : ''}
    <div class="row"><span class="label">Cashier</span><span class="value">${ticket.issued_by || '—'}</span></div>
    <div class="footer">Keep this receipt as proof of travel.<br/>TransitTicket System © ${new Date().getFullYear()}</div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🎫</div>
          <h2 className="font-black text-xl">Ticket Issued!</h2>
          <p className="text-gray-500 text-sm">Ready to print</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 font-mono text-center space-y-1">
          <p className="text-3xl font-black tracking-widest">{ticket.short_code}</p>
          <p className="text-xs text-gray-400">{ticket.ticket_id}</p>
          <p className="text-sm capitalize text-gray-600 font-bold">{ticket.type} · {ticket.ticket_category}</p>
          <p className="text-sm text-gray-500">{ticket.customer_name || 'Walk-in'}</p>
        </div>
        {fees.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-3 text-xs">
            <p className="font-bold text-amber-700 mb-1">Fees applied:</p>
            {fees.map((f, i) => (
              <div key={i} className="flex justify-between text-amber-600">
                <span>{f.name}</span>
                <span>{f.amount_kr > 0 ? `+${f.amount_kr} kr` : ''} {f.amount_percent > 0 ? `+${f.amount_percent}%` : ''}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Done</Button>
          <Button onClick={doPrint} className="flex-1 bg-gray-900 hover:bg-gray-800">
            <Printer className="w-4 h-4 mr-2" /> Print Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CashierSite() {
  const [account, setAccount] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [tab, setTab] = useState('topup');
  const [search, setSearch] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [topUpAmt, setTopUpAmt] = useState(2000);
  const [ticketType, setTicketType] = useState('adult');
  const [ticketCategory, setTicketCategory] = useState('single');
  const [buyForPhone, setBuyForPhone] = useState('');
  const [buyForName, setBuyForName] = useState('');
  const [printTicket, setPrintTicket] = useState(null);
  const [appliedFees, setAppliedFees] = useState([]);
  const qc = useQueryClient();

  const { data: cashiers = [] } = useQuery({ queryKey: ['cashiers'], queryFn: () => base44.entities.CashierAccount.list(), enabled: !account });
  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list(), enabled: !!account });
  const { data: fees = [] } = useQuery({ queryKey: ['fees'], queryFn: () => base44.entities.Fee.list(), enabled: !!account });
  const { data: txns = [] } = useQuery({ queryKey: ['cashier-txns'], queryFn: () => base44.entities.Transaction.list('-created_date', 80), enabled: !!account && tab === 'history' });

  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  // Get active cashier fees
  const cashierFees = fees.filter(f => f.is_active !== false && (f.applies_to === 'cashier' || f.applies_to === 'all'));

  const calcFeeTotal = () => cashierFees.reduce((sum, f) => sum + (f.amount_kr || 0), 0);

  const login = () => {
    const c = cashiers.find(c => c.username === loginForm.username && c.password === loginForm.password && c.is_active !== false);
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
      const feeKr = calcFeeTotal();
      const updated = await base44.entities.Customer.update(foundCustomer.id, { credits: (foundCustomer.credits || 0) + total });
      await base44.entities.Transaction.create({
        customer_id: foundCustomer.id, customer_name: foundCustomer.name,
        type: 'topup', amount: total, kr_amount: topUpAmt + feeKr,
        description: `Cashier top-up ${topUpAmt}kr (+40% bonus = ${total} cr)${feeKr ? ` + ${feeKr}kr fees` : ''}`,
        performed_by: account.name
      });
      return updated;
    },
    onSuccess: updated => {
      setFoundCustomer(updated);
      qc.invalidateQueries({ queryKey: ['cashier-txns'] });
      toast.success(`Top-up done! → ${topUpAmt + Math.round(topUpAmt * 0.4)} credits`);
    }
  });

  const doBuy = useMutation({
    mutationFn: async () => {
      const phone = (buyForPhone || foundCustomer?.phone || '').trim();
      const name = (buyForName || foundCustomer?.name || 'Walk-in').trim();
      let cust = foundCustomer;
      if (!cust && phone) {
        const res = await base44.entities.Customer.filter({ phone });
        cust = res[0] || null;
      }
      const cost = priceMap[ticketType]?.[ticketCategory];
      if (!cost) throw new Error('Price not configured for this ticket type');

      const feeKr = calcFeeTotal();
      const validUntil = ticketCategory === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      const ticketId = genTicketId();

      const ticket = await base44.entities.Ticket.create({
        ticket_id: ticketId,
        type: ticketType, ticket_category: ticketCategory,
        credits_paid: cost, fees_paid: feeKr,
        purchase_method: 'cashier',
        status: ticketCategory === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: cust?.id || '', customer_name: name,
        customer_phone: cust?.phone || phone || '',
        issued_by: account.name
      });

      if (cust) {
        const newCredits = (cust.credits || 0) - cost;
        if (newCredits < 0) throw new Error(`Insufficient credits (has ${cust.credits||0}, needs ${cost})`);
        const updatedCust = await base44.entities.Customer.update(cust.id, { credits: newCredits });
        if (cust.id === foundCustomer?.id) setFoundCustomer(updatedCust);
      }

      await base44.entities.Transaction.create({
        customer_id: cust?.id || '', customer_name: name,
        type: 'purchase', amount: cost, kr_amount: feeKr,
        description: `Cashier: ${ticketType} ${ticketCategory} ticket`,
        performed_by: account.name, ticket_id: ticketId
      });

      setAppliedFees(cashierFees);
      return ticket;
    },
    onSuccess: ticket => {
      qc.invalidateQueries({ queryKey: ['cashier-txns'] });
      setPrintTicket(ticket);
      setBuyForPhone(''); setBuyForName('');
    },
    onError: e => toast.error(e.message)
  });

  if (!account) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] border border-slate-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6"><LSTLogo size={56} className="mx-auto mb-3" /><h1 className="text-xl font-black text-white">POS Terminal</h1><p className="text-slate-500 text-sm mt-1">Cashier Login</p></div>
          <div className="space-y-3">
            <div><Label className="text-slate-400 text-xs">Username</Label><Input value={loginForm.username} onChange={e => setLoginForm(f => ({...f, username: e.target.value}))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
            <div><Label className="text-slate-400 text-xs">Password</Label><Input type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({...f, password: e.target.value}))} onKeyDown={e => e.key === 'Enter' && login()} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
            <Button onClick={login} className="w-full bg-[#c0392b] hover:bg-[#a93226] h-11 font-bold">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  const feeTotal = calcFeeTotal();
  const selectedCost = priceMap[ticketType]?.[ticketCategory];

  return (
    <div className="min-h-screen bg-gray-100">
      {printTicket && <TicketPrint ticket={printTicket} fees={appliedFees} onClose={() => setPrintTicket(null)} />}

      <header className="bg-[#0a0a0a] text-white px-6 py-3 flex justify-between items-center border-b-2 border-[#c0392b]">
        <div className="flex items-center gap-3"><LSTLogo size={32} /><div><p className="font-bold text-sm">POS Terminal</p><p className="text-slate-400 text-xs">{account.name}</p></div></div>
        <div className="flex items-center gap-3">
          {feeTotal > 0 && <span className="bg-amber-500 text-black text-xs px-3 py-1 rounded-full font-bold">+{feeTotal} kr fees active</span>}
          <Button variant="ghost" onClick={() => setAccount(null)} className="text-gray-400 hover:text-red-400"><LogOut className="w-4 h-4 mr-2" />Logout</Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        <div className="flex gap-2">
          {[['topup','💰 Top Up'],['sell','🎫 Sell Ticket'],['history','📋 History']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{label}</button>
          ))}
        </div>

        {/* Customer Finder */}
        {(tab === 'topup' || tab === 'sell') && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Find Customer <span className="text-gray-400 text-xs font-normal">(optional for walk-in)</span></h3>
            <div className="flex gap-2">
              <Input placeholder="Phone or email…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && findCustomer()} className="flex-1" />
              <Button onClick={findCustomer} className="bg-gray-800 hover:bg-gray-700"><Search className="w-4 h-4 mr-2" />Find</Button>
              {foundCustomer && <Button variant="outline" onClick={() => { setFoundCustomer(null); setSearch(''); }}>Clear</Button>}
            </div>
            {foundCustomer && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{foundCustomer.name}</p>
                  <p className="text-sm text-gray-500">{foundCustomer.phone} · {foundCustomer.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-blue-700">{foundCustomer.credits || 0}</p>
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
              {[500, 1000, 2000, 5000].map(v => (
                <button key={v} onClick={() => setTopUpAmt(v)}
                  className={`py-3 border-2 rounded-xl font-bold transition-all ${topUpAmt===v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{v} kr</button>
              ))}
            </div>
            <div><Label>Custom Amount (kr)</Label><Input type="number" value={topUpAmt} onChange={e => setTopUpAmt(Number(e.target.value))} /></div>
            {topUpAmt > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm space-y-1">
                <p className="text-green-700"><span className="font-bold">{topUpAmt} kr</span> → <span className="font-bold text-lg">{topUpAmt + Math.round(topUpAmt * 0.4)} credits</span></p>
                <p className="text-green-500 text-xs">Includes 40% bonus credits</p>
                {feeTotal > 0 && <p className="text-amber-600 font-semibold text-xs">+ {feeTotal} kr surcharge</p>}
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Passenger Phone</Label><Input placeholder="Leave blank = found customer" value={buyForPhone} onChange={e => setBuyForPhone(e.target.value)} /></div>
              <div><Label>Passenger Name</Label><Input placeholder="Walk-in" value={buyForName} onChange={e => setBuyForName(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              {[['single', '🎫 Single'],['period', '📅 30-Day']].map(([v, l]) => (
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
                    <span className="capitalize block">{t}</span>
                    <span className="text-gray-400">{cost || '—'} cr</span>
                  </button>
                );
              })}
            </div>

            {selectedCost && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Ticket cost</span>
                  <span className="font-bold text-blue-700">{selectedCost} credits</span>
                </div>
                {cashierFees.map((f, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-amber-600">{f.name}</span>
                    <span className="font-semibold text-amber-700">
                      {f.amount_kr > 0 ? `+${f.amount_kr} kr` : ''} {f.amount_percent > 0 ? `+${f.amount_percent}%` : ''}
                    </span>
                  </div>
                ))}
                {feeTotal > 0 && (
                  <div className="border-t border-blue-200 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-gray-700">Total surcharge</span>
                    <span className="text-amber-700">+{feeTotal} kr</span>
                  </div>
                )}
                {foundCustomer && <p className="text-blue-400 text-xs">Credits deducted from: {foundCustomer.name}</p>}
              </div>
            )}
            <Button onClick={() => doBuy.mutate()} disabled={doBuy.isPending} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
              <ShoppingBag className="w-4 h-4 mr-2" /> Issue Ticket & Print
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
              <thead className="bg-gray-50">
                <tr>{['Customer','Ticket ID','Type','Credits','Description','Time'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.customer_name || '—'}</td>
                    <td className="px-4 py-3">{t.ticket_id ? <code className="text-xs bg-gray-100 px-2 py-1 rounded">{t.ticket_id}</code> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.type==='topup' ? 'bg-green-100 text-green-700' : t.type==='purchase' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.type}</span>
                    </td>
                    <td className="px-4 py-3 font-bold">{t.amount} cr</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.description}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_date).toLocaleString('nb-NO')}</td>
                  </tr>
                ))}
                {txns.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}