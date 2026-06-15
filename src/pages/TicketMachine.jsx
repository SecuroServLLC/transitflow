import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG } from 'qrcode.react';
import CashPad from '@/components/machine/CashPad';
import { validateLuhn, generateCardNumber, generateCardholderName, generateExpiry, generateCVV, formatCardDisplay } from '@/utils/luhn';
import { genShortCode, genTicketId } from '@/utils/customerAuth';

function genAccessPin() {
  let pin = '';
  for (let i = 0; i < 12; i++) pin += Math.floor(Math.random() * 10);
  return pin;
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, RotateCcw, Wand2, Lock, Settings, DollarSign, CreditCard, BarChart2, X } from 'lucide-react';

const TYPES = [
  { type: 'adult', label: 'Adult', icon: '🧑' },
  { type: 'child', label: 'Child', icon: '👶' },
  { type: 'senior', label: 'Senior', icon: '👴' },
  { type: 'student', label: 'Student', icon: '🎓' },
  { type: 'military', label: 'Military', icon: '🪖' },
];

const SESSION_KEY = 'transit_machine_session';

function getMachineSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setMachineSession(data) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function clearMachineSession() { sessionStorage.removeItem(SESSION_KEY); }

export default function TicketMachine() {
  const [loginStep, setLoginStep] = useState('admin'); // 'admin' | 'machineId' | 'pin'
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [machineIdInput, setMachineIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pendingMachine, setPendingMachine] = useState(null);
  const [account, setAccount] = useState(getMachineSession());
  const [screen, setScreen] = useState('home');
  const [selectedType, setSelectedType] = useState('adult');
  const [category, setCategory] = useState('single');
  const [payMethod, setPayMethod] = useState(null);
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [ticket, setTicket] = useState(null);
  const [topupAmount, setTopupAmount] = useState(500);
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [lookupPhone, setLookupPhone] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [sessionStats, setSessionStats] = useState({ cash: 0, card: 0, txns: 0 });
  const qc = useQueryClient();

  const { data: machines = [], refetch: refetchMachines } = useQuery({
    queryKey: ['machines-login'],
    queryFn: () => base44.entities.MachineAccount.list(),
    enabled: !account
  });
  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list(), enabled: !!account });

  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const cost = priceMap[selectedType]?.[category] || 0;
  const bonusCredits = Math.round(topupAmount * 0.4);

  // Step 1: admin/admin check
  const checkAdmin = () => {
    if (adminForm.username === 'admin' && adminForm.password === 'admin') {
      setLoginStep('machineId');
    } else {
      toast.error('Invalid admin credentials');
    }
  };

  // Step 2: find machine by ID (fetch fresh from DB to avoid stale cache)
  const checkMachineId = async () => {
    const id = machineIdInput.trim().toUpperCase();
    if (!id) return;
    const all = await base44.entities.MachineAccount.list();
    const m = all.find(m => m.machine_id === id && m.is_active !== false);
    if (!m) { toast.error('Machine ID not found or inactive'); return; }
    if (m.force_locked) { toast.error('This machine is force-locked by admin. Contact support.'); return; }
    if (m.session_token) { toast.error('This machine is already active on another device'); return; }
    setPendingMachine(m);
    setLoginStep('pin');
  };

  // Step 3: verify PIN and activate session
  const checkPin = async () => {
    const pin = pinInput.replace(/\s/g, '');
    if (pin !== pendingMachine.access_pin) { toast.error('Incorrect PIN'); return; }
    const token = genAccessPin(); // random session token
    await base44.entities.MachineAccount.update(pendingMachine.id, { session_token: token });
    const session = { ...pendingMachine, session_token: token };
    setMachineSession(session);
    setAccount(session);
    toast.success(`${pendingMachine.name} activated!`);
  };

  const lockMachine = async () => {
    if (account) {
      await base44.entities.MachineAccount.update(account.id, { session_token: '' });
    }
    clearMachineSession();
    setAccount(null);
    setLoginStep('admin');
    setAdminForm({ username: '', password: '' });
    setMachineIdInput('');
    setPinInput('');
    setPendingMachine(null);
  };

  const reset = () => { setScreen('home'); setTicket(null); setPayMethod(null); setCardForm({ number: '', name: '', expiry: '', cvv: '' }); setFoundCustomer(null); setLookupPhone(''); };

  const lookupCustomer = async () => {
    if (!lookupPhone.trim()) return;
    const res = await base44.entities.Customer.filter({ phone: lookupPhone.trim() });
    if (res.length > 0) setFoundCustomer(res[0]);
    else { toast.error('Customer not found'); setFoundCustomer(null); }
  };

  const recordCashSale = async (amount) => {
    if (account) {
      const fresh = await base44.entities.MachineAccount.filter({ machine_id: account.machine_id });
      const m = fresh[0];
      const newCash = (m?.cash_balance || 0) + amount;
      const newTxns = (m?.total_transactions || 0) + 1;
      await base44.entities.MachineAccount.update(account.id, { cash_balance: newCash, total_transactions: newTxns });
      setSessionStats(s => ({ ...s, cash: s.cash + amount, txns: s.txns + 1 }));
    }
  };

  const recordCardSale = async (amount) => {
    if (account) {
      const fresh = await base44.entities.MachineAccount.filter({ machine_id: account.machine_id });
      const m = fresh[0];
      const newCard = (m?.card_balance || 0) + amount;
      const newTxns = (m?.total_transactions || 0) + 1;
      await base44.entities.MachineAccount.update(account.id, { card_balance: newCard, total_transactions: newTxns });
      setSessionStats(s => ({ ...s, card: s.card + amount, txns: s.txns + 1 }));
    }
  };

  const buyWithCash = useMutation({
    mutationFn: async ({ ticketType, ticketCategory, ticketCost, customer }) => {
      const validUntil = ticketCategory === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      const ticketId = genTicketId();
      const t = await base44.entities.Ticket.create({
        ticket_id: ticketId,
        type: ticketType, ticket_category: ticketCategory, credits_paid: ticketCost,
        kr_paid: ticketCost,
        purchase_method: 'machine', status: ticketCategory === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: customer?.id || '', customer_name: customer?.name || 'Guest',
        customer_phone: customer?.phone || '', issued_by: account?.name || 'machine'
      });
      return { ticket: t, ticketCost };
    },
    onSuccess: async ({ ticket: t, ticketCost }) => { await recordCashSale(ticketCost); setTicket(t); setScreen('done'); },
    onError: (e) => { toast.error(e.message || 'Payment failed'); }
  });

  const buyWithCard = useMutation({
    mutationFn: async ({ card, ticketType, ticketCategory, ticketCost, customer }) => {
      const clean = card.number.replace(/\s/g, '');
      if (!validateLuhn(clean)) throw new Error('Invalid card number');
      const validUntil = ticketCategory === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      const ticketId = genTicketId();
      const t = await base44.entities.Ticket.create({
        ticket_id: ticketId,
        type: ticketType, ticket_category: ticketCategory, credits_paid: ticketCost,
        kr_paid: ticketCost,
        purchase_method: 'machine', status: ticketCategory === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: customer?.id || '', customer_name: customer?.name || 'Guest',
        customer_phone: customer?.phone || '', issued_by: account?.name || 'machine'
      });
      return { ticket: t, ticketCost };
    },
    onSuccess: async ({ ticket: t, ticketCost }) => { await recordCardSale(ticketCost); setTicket(t); setScreen('done'); },
    onError: (e) => { toast.error(e.message || 'Card payment failed'); }
  });

  const doTopUp = useMutation({
    mutationFn: async () => {
      if (!foundCustomer) throw new Error('Find a customer first');
      const bonus = Math.round(topupAmount * 0.4);
      const total = topupAmount + bonus;
      const updated = await base44.entities.Customer.update(foundCustomer.id, { credits: (foundCustomer.credits || 0) + total });
      await base44.entities.Transaction.create({
        customer_id: foundCustomer.id, customer_name: foundCustomer.name,
        type: 'topup', amount: total, kr_amount: topupAmount,
        description: `Machine top-up ${topupAmount}kr (+40% = ${bonus})`,
        performed_by: account?.name || 'machine'
      });
      return { updated, total };
    },
    onSuccess: ({ total }) => { toast.success(`Done! ${total} credits added.`); reset(); }
  });

  // LOGIN SCREENS
  if (!account) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🖥️</div>
            <h1 className="text-2xl font-bold">Ticket Machine</h1>
            <div className="flex justify-center gap-2 mt-3">
              {['admin', 'machineId', 'pin'].map((s, i) => (
                <div key={s} className={`w-3 h-3 rounded-full transition-all ${loginStep === s ? 'bg-blue-600 scale-125' : i < ['admin', 'machineId', 'pin'].indexOf(loginStep) ? 'bg-green-400' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          {loginStep === 'admin' && (
            <div className="space-y-3">
              <p className="text-gray-500 text-sm text-center">Step 1: Admin authorization</p>
              <Input placeholder="Admin username" value={adminForm.username} onChange={e => setAdminForm(f => ({ ...f, username: e.target.value }))} className="h-12 text-center" />
              <Input type="password" placeholder="Admin password" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} className="h-12 text-center" onKeyDown={e => e.key === 'Enter' && checkAdmin()} />
              <Button onClick={checkAdmin} className="w-full h-12 bg-slate-800 hover:bg-slate-700">Continue →</Button>
            </div>
          )}

          {loginStep === 'machineId' && (
            <div className="space-y-3">
              <p className="text-gray-500 text-sm text-center">Step 2: Enter Machine ID</p>
              <Input
                placeholder="6-char ID (e.g. AB3D7F)"
                value={machineIdInput}
                onChange={e => setMachineIdInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && checkMachineId()}
                className="h-14 text-2xl font-mono tracking-widest text-center"
                maxLength={6}
              />
              <Button onClick={checkMachineId} className="w-full h-12 bg-blue-600 hover:bg-blue-700">Find Machine →</Button>
              <Button variant="ghost" onClick={() => setLoginStep('admin')} className="w-full text-gray-400">← Back</Button>
            </div>
          )}

          {loginStep === 'pin' && (
            <div className="space-y-3">
              <p className="text-gray-500 text-sm text-center">Step 3: Enter 12-digit PIN for <strong>{pendingMachine?.name}</strong></p>
              <Input
                placeholder="123456789012"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && checkPin()}
                className="h-14 text-xl font-mono tracking-wider text-center"
                maxLength={12}
              />
              <Button onClick={checkPin} className="w-full h-12 bg-green-600 hover:bg-green-700">Activate Machine ✓</Button>
              <Button variant="ghost" onClick={() => { setLoginStep('machineId'); setPendingMachine(null); setPinInput(''); }} className="w-full text-gray-400">← Back</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 px-5 py-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">🖥️ {account.name}</h1>
          <p className="text-slate-400 text-xs">{account.terminal || account.location || '—'}{account.platform ? ` · ${account.platform}` : ''} · ID: <span className="font-mono font-bold text-blue-400">{account.machine_id}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdminPanel(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-amber-400 text-sm transition-colors border border-slate-700 rounded-lg px-3 py-1.5">
            <Settings className="w-4 h-4" /> Admin
          </button>
          <button onClick={lockMachine} className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors">
            <Lock className="w-4 h-4" /> Lock
          </button>
        </div>
      </header>

      {/* Admin Cash Panel Overlay */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> Machine Admin</h2>
              <button onClick={() => setShowAdminPanel(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Cash in Machine', value: `${((account.cash_balance || 0) + sessionStats.cash).toLocaleString()} kr`, icon: DollarSign, color: 'text-green-400' },
                { label: 'Card Collected', value: `${((account.card_balance || 0) + sessionStats.card).toLocaleString()} kr`, icon: CreditCard, color: 'text-blue-400' },
                { label: 'Session Txns', value: sessionStats.txns, icon: BarChart2, color: 'text-purple-400' },
                { label: 'Total All Time', value: (account.total_transactions || 0) + sessionStats.txns, icon: BarChart2, color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-center">
                  <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs text-center">Cash can only be emptied from the Admin Office. Session data will sync on next refresh.</p>
            <Button onClick={() => setShowAdminPanel(false)} className="w-full bg-slate-700 hover:bg-slate-600">Close</Button>
          </div>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-2xl">

          {screen === 'home' && (
            <div className="grid grid-cols-2 gap-5 mt-8">
              {[
                { id: 'buy', icon: '🎫', label: 'Buy Ticket', desc: 'Single or period ticket' },
                { id: 'topup', icon: '⚡', label: 'Top Up Credits', desc: 'Add travel credits' },
              ].map(({ id, icon, label, desc }) => (
                <button key={id} onClick={() => setScreen(id)}
                  className="bg-slate-800 hover:bg-blue-600 border-2 border-slate-700 hover:border-blue-500 rounded-3xl p-10 flex flex-col items-center gap-4 transition-all">
                  <span className="text-7xl">{icon}</span>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{label}</p>
                    <p className="text-slate-400 text-sm mt-1">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {screen === 'buy' && !payMethod && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={reset} className="text-slate-400 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold">Buy Ticket</h2>
              </div>
              <div className="flex gap-3">
                {[['single', '🎫 Single'], ['period', '📅 30-Day']].map(([v, l]) => (
                  <button key={v} onClick={() => setCategory(v)}
                    className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${category === v ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-600 text-slate-300'}`}>{l}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {TYPES.map(t => {
                  const price = priceMap[t.type]?.[category];
                  return (
                    <button key={t.type} onClick={() => setSelectedType(t.type)}
                      className={`py-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${selectedType === t.type ? 'border-blue-400 bg-blue-600' : 'border-slate-600 hover:border-slate-400'}`}>
                      <span className="text-4xl">{t.icon}</span>
                      <span className="text-xs font-medium">{t.label}</span>
                      <span className="text-xs text-slate-400">{price || '—'} kr</span>
                    </button>
                  );
                })}
              </div>
              <div className="bg-slate-800 rounded-2xl p-5 text-center">
                <p className="text-slate-400">Total</p>
                <p className="text-5xl font-black mt-1">{cost} kr</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Optional: link to account</p>
                <div className="flex gap-2">
                  <Input value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} placeholder="Phone number…" className="bg-slate-800 border-slate-600 text-white h-12" />
                  <Button onClick={lookupCustomer} className="bg-slate-700 hover:bg-slate-600 h-12 px-5">Find</Button>
                </div>
                {foundCustomer && <p className="text-green-400 text-sm mt-2 text-center">✓ {foundCustomer.name}</p>}
              </div>
              {cost <= 0 ? (
                <div className="bg-red-900/30 border border-red-600 rounded-2xl p-4 text-center">
                  <p className="text-red-400 font-bold">No pricing configured</p>
                  <p className="text-red-300 text-sm mt-1">Contact admin to set up ticket pricing</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setPayMethod('cash')} className="h-14 text-lg bg-amber-700 hover:bg-amber-600">💵 Cash</Button>
                  <Button onClick={() => setPayMethod('card')} className="h-14 text-lg bg-blue-600 hover:bg-blue-700">💳 Card</Button>
                </div>
              )}
            </div>
          )}

          {screen === 'buy' && payMethod === 'cash' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setPayMethod(null)} className="text-slate-400 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold">Cash — {cost} kr</h2>
              </div>
              <CashPad targetAmount={cost} onComplete={() => buyWithCash.mutate({ ticketType: selectedType, ticketCategory: category, ticketCost: cost, customer: foundCustomer })} onCancel={() => setPayMethod(null)} />
            </div>
          )}

          {screen === 'buy' && payMethod === 'card' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setPayMethod(null)} className="text-slate-400 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold">Card — {cost} kr</h2>
              </div>
              <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
                <Button variant="outline" onClick={() => setCardForm({ number: formatCardDisplay(generateCardNumber()), name: generateCardholderName(), expiry: generateExpiry(), cvv: generateCVV() })}
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"><Wand2 className="w-4 h-4 mr-2" /> Generate Test Card</Button>
                <Input value={cardForm.number} onChange={e => setCardForm(f => ({ ...f, number: e.target.value }))} placeholder="Card Number" className="bg-slate-700 border-slate-600 text-white h-14 text-center text-lg font-mono" />
                <Input value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} placeholder="Cardholder Name" className="bg-slate-700 border-slate-600 text-white h-12" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={cardForm.expiry} onChange={e => setCardForm(f => ({ ...f, expiry: e.target.value }))} placeholder="MM/YY" className="bg-slate-700 border-slate-600 text-white h-12 text-center" />
                  <Input value={cardForm.cvv} onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value }))} placeholder="CVV" className="bg-slate-700 border-slate-600 text-white h-12 text-center" />
                </div>
              </div>
              <Button onClick={() => buyWithCard.mutate({ card: cardForm, ticketType: selectedType, ticketCategory: category, ticketCost: cost, customer: foundCustomer })} disabled={buyWithCard.isPending} className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700">💳 Pay {cost} kr</Button>
            </div>
          )}

          {screen === 'topup' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={reset} className="text-slate-400 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold">Top Up Credits</h2>
              </div>
              <div className="flex gap-2">
                <Input value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} placeholder="Customer phone…" className="bg-slate-800 border-slate-600 text-white h-12" />
                <Button onClick={lookupCustomer} className="bg-slate-700 hover:bg-slate-600 h-12 px-5">Find</Button>
              </div>
              {foundCustomer && (
                <div className="bg-green-900/30 border border-green-600 rounded-xl p-4">
                  <p className="font-bold text-green-400">{foundCustomer.name}</p>
                  <p className="text-slate-400 text-sm">Current: {foundCustomer.credits || 0} credits</p>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {[250, 500, 1000, 2000].map(v => (
                  <button key={v} onClick={() => setTopupAmount(v)}
                    className={`py-3 border-2 rounded-xl font-bold transition-all ${topupAmount === v ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-600 text-slate-300'}`}>{v}</button>
                ))}
              </div>
              <Input type="number" value={topupAmount} onChange={e => setTopupAmount(Number(e.target.value))} className="bg-slate-800 border-slate-600 text-white h-12 text-center text-xl" />
              <div className="bg-slate-800 rounded-2xl p-4 text-center">
                <p className="text-slate-400">Pay: <span className="font-bold text-white text-xl">{topupAmount} kr</span></p>
                <p className="text-green-400 font-bold text-3xl mt-1">Get: {topupAmount + bonusCredits} credits</p>
                <p className="text-green-600 text-sm">+40% bonus</p>
              </div>
              <CashPad targetAmount={topupAmount} onComplete={() => doTopUp.mutate()} onCancel={reset} />
            </div>
          )}

          {screen === 'done' && ticket && (
            <div className="flex flex-col items-center gap-6 text-center py-8">
              <div className="text-6xl">✅</div>
              <h2 className="text-4xl font-black">Ticket Ready!</h2>
              <div className="bg-white p-5 rounded-2xl shadow-xl"><QRCodeSVG value={ticket.qr_token} size={220} level="H" /></div>
              <div>
                <p className="text-2xl font-bold text-blue-400 capitalize">{ticket.type} — {ticket.ticket_category}</p>
                <p className="font-mono font-bold tracking-widest text-2xl text-white mt-2 bg-slate-700 px-6 py-3 rounded-xl">{ticket.short_code}</p>
                <p className="text-slate-400 text-sm mt-1">Use this code in the app to retrieve your ticket</p>
              </div>
              <Button onClick={reset} className="w-full h-16 text-xl bg-slate-700 hover:bg-slate-600">
                <RotateCcw className="w-5 h-5 mr-2" /> New Transaction
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}