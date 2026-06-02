import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, LogOut, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function InspectorSite() {
  const [step, setStep] = useState('username'); // 'username' | 'code' | 'validated'
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [inspector, setInspector] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => base44.entities.Inspector.list()
  });

  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['all-tickets'],
    queryFn: () => base44.entities.Ticket.list('-purchased_at', 1000),
    enabled: !!inspector
  });

  const markUsed = useMutation({
    mutationFn: ({ id }) => base44.entities.Ticket.update(id, { status: 'used', used_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tickets'] })
  });

  const loginStep = () => {
    if (!username.trim()) { toast.error('Enter username'); return; }
    setStep('code');
  };

  const loginWithCode = () => {
    const found = inspectors.find(
      i => i.username?.toLowerCase() === username.trim().toLowerCase()
        && i.access_code === accessCode.trim()
        && i.is_active !== false
    );
    if (found) {
      setInspector(found);
      setStep('validated');
      toast.success(`Welcome, ${found.name}!`);
    } else {
      toast.error('Invalid username or access code');
    }
  };

  const validate = () => {
    const q = code.trim().toUpperCase();
    if (!q) { toast.error('Enter a code'); return; }

    const ticket = tickets.find(t =>
      (t.short_code && t.short_code.toUpperCase() === q) ||
      (t.ticket_id && t.ticket_id.toUpperCase() === q) ||
      (t.qr_token && (t.qr_token.substring(0, 8).toUpperCase() === q || t.qr_token === q.toLowerCase()))
    );

    if (!ticket) { setResult({ valid: false, reason: 'Ticket not found in system' }); return; }

    const now = new Date();
    if (ticket.ticket_category === 'period') {
      const validUntil = ticket.valid_until ? new Date(ticket.valid_until) : null;
      if (!validUntil || validUntil < now) {
        setResult({ valid: false, reason: 'Period ticket expired', ticket });
        return;
      }
      setResult({ valid: true, ticket, msg: `Period pass — valid until ${new Date(ticket.valid_until).toLocaleDateString('nb-NO')}` });
      return;
    }

    if (ticket.status === 'used') { setResult({ valid: false, reason: 'Already used', ticket }); return; }
    if (ticket.status === 'expired') { setResult({ valid: false, reason: 'Ticket expired', ticket }); return; }

    markUsed.mutate({ id: ticket.id });
    setResult({ valid: true, ticket, msg: 'Single ticket — marked as used ✓' });
  };

  const reset = () => { setCode(''); setResult(null); refetchTickets(); };

  const logout = () => { setInspector(null); setStep('username'); setUsername(''); setAccessCode(''); setCode(''); setResult(null); };

  // Login screens
  if (step === 'username') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔍</div>
            <h1 className="text-2xl font-bold text-white">Inspector Login</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your username</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loginStep()}
              className="bg-slate-700 border-slate-600 text-white text-center text-xl h-14 placeholder:text-slate-500"
            />
            <Button onClick={loginStep} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg">Next →</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold text-white">Access Code</h1>
            <p className="text-slate-400 text-sm mt-1">Welcome, <span className="text-blue-400 font-bold">{username}</span> — enter your code</p>
          </div>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Access Code"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loginWithCode()}
              className="bg-slate-700 border-slate-600 text-white text-center text-2xl font-mono tracking-widest h-16 placeholder:text-slate-500"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('username')} className="flex-1 border-slate-600 text-slate-300">← Back</Button>
              <Button onClick={loginWithCode} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700">Login</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main inspector panel
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <div>
          <h1 className="font-bold text-xl">🔍 Inspector Panel</h1>
          <p className="text-slate-400 text-sm">{inspector.name} <span className="text-slate-600 text-xs ml-1">@{inspector.username}</span></p>
        </div>
        <Button variant="ghost" onClick={logout} className="text-slate-400 hover:text-red-400">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {!result ? (
          <div className="w-full space-y-6">
            <div className="text-center">
              <Search className="w-16 h-16 text-blue-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Validate Ticket</h2>
              <p className="text-slate-400 mt-1 text-sm">Enter the short code or Ticket ID</p>
            </div>
            <Input
              placeholder="e.g. A1B2C3D4 or TT-AB123-XY12"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && validate()}
              className="bg-slate-800 border-slate-600 text-white text-center text-xl font-mono tracking-widest h-20 placeholder:text-slate-600"
            />
            <Button onClick={validate} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-xl">
              <Search className="w-5 h-5 mr-2" /> Validate
            </Button>
            <p className="text-center text-slate-600 text-xs">{tickets.length} tickets loaded</p>
          </div>
        ) : (
          <div className="w-full space-y-5 text-center">
            {result.valid ? (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-3xl p-8">
                <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto mb-4" />
                <h2 className="text-6xl font-black text-green-400">VALID</h2>
                <p className="text-green-200 text-2xl mt-3 capitalize">{result.ticket.type} — {result.ticket.ticket_category}</p>
                <p className="text-slate-300 text-base mt-2">{result.msg}</p>
                {result.ticket.customer_name && <p className="text-slate-400 text-sm mt-1">Passenger: {result.ticket.customer_name}</p>}
                {result.ticket.ticket_id && <p className="text-slate-600 text-xs mt-1 font-mono">{result.ticket.ticket_id}</p>}
              </div>
            ) : (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-3xl p-8">
                <XCircle className="w-24 h-24 text-red-400 mx-auto mb-4" />
                <h2 className="text-6xl font-black text-red-400">INVALID</h2>
                <p className="text-red-300 text-xl mt-3">{result.reason}</p>
                {result.ticket && <p className="text-slate-400 text-sm mt-2 capitalize">{result.ticket.type} · {result.ticket.status}</p>}
              </div>
            )}
            <Button onClick={reset} variant="outline" className="w-full h-16 text-lg border-slate-600 text-slate-300 hover:bg-slate-800">
              ← Check Another Ticket
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}