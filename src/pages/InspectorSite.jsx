import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, LogOut, Search, Camera } from 'lucide-react';
import { toast } from 'sonner';

export default function InspectorSite() {
  const [pin, setPin] = useState('');
  const [inspector, setInspector] = useState(null);
  const [mode, setMode] = useState('code'); // 'code' or 'qr'
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });
  const { data: tickets = [] } = useQuery({
    queryKey: ['all-tickets'],
    queryFn: () => base44.entities.Ticket.list('-purchased_at', 500),
    enabled: !!inspector
  });

  const markUsed = useMutation({
    mutationFn: ({ id }) => base44.entities.Ticket.update(id, { status: 'used', used_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tickets'] })
  });

  const loginWithPin = () => {
    const found = inspectors.find(i => i.pin === pin.trim());
    if (found) { setInspector(found); toast.success(`Welcome, ${found.name}!`); }
    else toast.error('Invalid PIN');
  };

  const validate = (input) => {
    const q = (input || code).trim().toUpperCase();
    if (!q) { toast.error('Enter code'); return; }

    // Match short_code, QR token start, or full token
    const ticket = tickets.find(t =>
      (t.short_code && t.short_code.toUpperCase() === q) ||
      (t.qr_token && (t.qr_token.substring(0, 8).toUpperCase() === q || t.qr_token === q.toLowerCase()))
    );

    if (!ticket) { setResult({ valid: false, reason: 'Ticket not found' }); return; }

    const now = new Date();
    if (ticket.ticket_category === 'period') {
      const validUntil = ticket.valid_until ? new Date(ticket.valid_until) : null;
      if (!validUntil || validUntil < now) { setResult({ valid: false, reason: 'Period ticket expired', ticket }); return; }
      setResult({ valid: true, ticket, msg: `Valid until ${validUntil.toLocaleDateString()}` }); return;
    }

    if (ticket.status === 'used') { setResult({ valid: false, reason: 'Already used', ticket }); return; }
    if (ticket.status === 'expired') { setResult({ valid: false, reason: 'Ticket expired', ticket }); return; }

    markUsed.mutate({ id: ticket.id });
    setResult({ valid: true, ticket, msg: 'Single ticket — now marked as used' });
  };

  const reset = () => { setCode(''); setResult(null); };

  // PIN Login
  if (!inspector) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔍</div>
            <h1 className="text-2xl font-bold text-white">Inspector Login</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your PIN to begin</p>
          </div>
          <div className="space-y-4">
            <Input type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&loginWithPin()}
              className="bg-slate-700 border-slate-600 text-white text-center text-3xl font-mono tracking-widest h-16 placeholder:text-slate-500" />
            <Button onClick={loginWithPin} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <div><h1 className="font-bold text-xl">🔍 Inspector Panel</h1><p className="text-slate-400 text-sm">{inspector.name}</p></div>
        <Button variant="ghost" onClick={() => { setInspector(null); setResult(null); setCode(''); }} className="text-slate-400 hover:text-red-400">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {!result ? (
          <div className="w-full space-y-6">
            <div className="text-center">
              <Search className="w-16 h-16 text-blue-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Validate Ticket</h2>
              <p className="text-slate-400 mt-1 text-sm">Enter the 8-character short code</p>
            </div>

            <div className="flex gap-2">
              {[['code','⌨️ Code'],['qr','📷 QR Scan']].map(([m,l]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-semibold transition-all ${mode===m ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-600 text-slate-300'}`}>{l}</button>
              ))}
            </div>

            {mode === 'code' && (
              <>
                <Input placeholder="e.g. A1B2C3D4" value={code}
                  onChange={e=>setCode(e.target.value.toUpperCase())}
                  onKeyDown={e=>e.key==='Enter'&&validate()}
                  className="bg-slate-800 border-slate-600 text-white text-center text-3xl font-mono tracking-widest h-20 placeholder:text-slate-600" />
                <Button onClick={() => validate()} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-xl">
                  <Search className="w-5 h-5 mr-2" /> Validate
                </Button>
              </>
            )}

            {mode === 'qr' && (
              <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center space-y-3">
                <Camera className="w-16 h-16 text-slate-500 mx-auto" />
                <p className="text-slate-400">QR scan coming soon</p>
                <p className="text-slate-600 text-xs">Use the code entry for now</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-5 text-center">
            {result.valid ? (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-3xl p-10">
                <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto mb-4" />
                <h2 className="text-6xl font-black text-green-400">VALID</h2>
                <p className="text-green-200 text-2xl mt-3 capitalize">{result.ticket.type} — {result.ticket.ticket_category}</p>
                <p className="text-slate-400 text-sm mt-2">{result.msg}</p>
                {result.ticket.customer_name && <p className="text-slate-500 text-xs mt-1">Customer: {result.ticket.customer_name}</p>}
              </div>
            ) : (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-3xl p-10">
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