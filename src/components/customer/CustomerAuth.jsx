import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { setCustomerSession, derivePin, validatePin } from '@/utils/customerAuth';
import { toast } from 'sonner';

export default function CustomerAuth({ onLogin, minimal = false }) {
  const [tab, setTab] = useState('login');
  const [loginMode, setLoginMode] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const emailLogin = async () => {
    if (!email || !password) { toast.error('Fill in all fields'); return; }
    setLoading(true);
    try {
      const list = await base44.entities.Customer.filter({ email: email.toLowerCase().trim() });
      const c = list.find(c => c.password === password);
      if (!c) { toast.error('Invalid email or password'); return; }
      // Fetch full record to get all fields including credit_cards
      const full = await base44.entities.Customer.filter({ id: c.id });
      const fullRecord = full[0] || c;
      setCustomerSession(fullRecord);
      onLogin(fullRecord);
    } finally { setLoading(false); }
  };

  const phoneLogin = async () => {
    if (!phone || !pin) { toast.error('Fill in all fields'); return; }
    setLoading(true);
    try {
      const list = await base44.entities.Customer.filter({ phone: phone.trim() });
      const c = list.find(c => validatePin(c.phone, pin));
      if (!c) { toast.error('Invalid phone or PIN'); return; }
      const full = await base44.entities.Customer.filter({ id: c.id });
      const fullRecord = full[0] || c;
      setCustomerSession(fullRecord);
      onLogin(fullRecord);
    } finally { setLoading(false); }
  };

  const register = async () => {
    if (!regName || !regEmail || !regPass) { toast.error('Fill all required fields'); return; }
    setLoading(true);
    try {
      const existing = await base44.entities.Customer.filter({ email: regEmail.toLowerCase().trim() });
      if (existing.length > 0) { toast.error('Email already registered'); return; }
      const c = await base44.entities.Customer.create({
        name: regName.trim(), email: regEmail.toLowerCase().trim(),
        password: regPass, phone: regPhone.trim(), credits: 0
      });
      const derivedPin = derivePin(regPhone);
      toast.success(`Account created!${derivedPin ? ` PIN: ${derivedPin}` : ''}`);
      setCustomerSession(c);
      onLogin(c);
    } finally { setLoading(false); }
  };

  const wrap = minimal ? 'bg-white rounded-2xl p-6 shadow-lg' : 'min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4';
  const inner = minimal ? '' : 'bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl';

  const Content = (
    <div className={minimal ? '' : inner}>
      {!minimal && (
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🚌</div>
          <h1 className="text-2xl font-bold text-gray-900">TransitTicket</h1>
          <p className="text-gray-400 text-sm mt-1">Your ride, your way</p>
        </div>
      )}

      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {[['login','Sign In'],['register','Register']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === v ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}>{l}</button>
        ))}
      </div>

      {tab === 'login' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[['email','📧 Email'],['phone','📱 Phone/PIN']].map(([m,l]) => (
              <button key={m} onClick={() => setLoginMode(m)}
                className={`flex-1 py-2 border rounded-lg text-xs font-medium transition-all ${
                  loginMode === m ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'
                }`}>{l}</button>
            ))}
          </div>

          {loginMode === 'email' ? (
            <>
              <div><Label>Email</Label><Input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&emailLogin()} /></div>
              <div><Label>Password</Label><Input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&emailLogin()} /></div>
              <Button onClick={emailLogin} disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700">{loading ? 'Signing in…' : 'Sign In'}</Button>
            </>
          ) : (
            <>
              <div><Label>Phone Number</Label><Input placeholder="41272343" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
              <div>
                <Label>PIN</Label>
                <Input placeholder="4143" value={pin} maxLength={4} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&phoneLogin()} className="text-center text-2xl font-mono tracking-widest" />
                <p className="text-xs text-gray-400 mt-1 text-center">First 2 + last 2 digits of phone</p>
              </div>
              <Button onClick={phoneLogin} disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700">{loading ? 'Signing in…' : 'Sign In with PIN'}</Button>
            </>
          )}
        </div>
      )}

      {tab === 'register' && (
        <div className="space-y-3">
          <div><Label>Full Name *</Label><Input placeholder="John Smith" value={regName} onChange={e=>setRegName(e.target.value)} /></div>
          <div><Label>Email *</Label><Input type="email" placeholder="you@example.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)} /></div>
          <div><Label>Password *</Label><Input type="password" placeholder="Create a password" value={regPass} onChange={e=>setRegPass(e.target.value)} /></div>
          <div>
            <Label>Phone (optional)</Label>
            <Input placeholder="41272343" value={regPhone} onChange={e=>setRegPhone(e.target.value)} />
            {regPhone && <p className="text-xs text-blue-500 mt-1">Your PIN: <span className="font-mono font-bold">{derivePin(regPhone) || '…'}</span></p>}
          </div>
          <Button onClick={register} disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700 mt-2">{loading ? 'Creating…' : 'Create Account'}</Button>
        </div>
      )}
    </div>
  );

  return minimal ? Content : <div className={wrap}>{Content}</div>;
}