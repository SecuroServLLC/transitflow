import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, LogOut, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function InspectorSite() {
  const [pin, setPin] = useState('');
  const [inspector, setInspector] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.Ticket.list(), enabled: !!inspector });

  const markUsed = useMutation({
    mutationFn: ({ id }) => base44.entities.Ticket.update(id, { status: 'used', used_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] })
  });

  const loginWithPin = () => {
    const found = inspectors.find(i => i.pin === pin.trim());
    if (found) { setInspector(found); toast.success(`Welcome, ${found.name}!`); }
    else toast.error('Invalid PIN');
  };

  const validate = () => {
    const input = code.trim().toUpperCase();
    if (!input) { toast.error('Enter the inspector code from the ticket'); return; }

    // Match by short_code OR first 8 chars of qr_token
    const ticket = tickets.find(t =>
      (t.short_code && t.short_code.toUpperCase() === input) ||
      (t.qr_token && t.qr_token.substring(0, 8).toUpperCase() === input)
    );

    if (!ticket) { setResult({ valid: false, reason: 'Ticket not found' }); return; }
    if (ticket.status === 'used') { setResult({ valid: false, reason: 'Already used', ticket }); return; }
    if (ticket.status === 'expired') { setResult({ valid: false, reason: 'Ticket expired', ticket }); return; }

    markUsed.mutate({ id: ticket.id });
    setResult({ valid: true, ticket });
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
            <Input type="password" placeholder="Enter PIN" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loginWithPin()}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-center text-2xl h-14 tracking-widest" />
            <Button onClick={loginWithPin} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <div>
          <h1 className="font-bold text-white text-lg">🔍 Inspector Panel</h1>
          <p className="text-slate-400 text-sm">{inspector.name}</p>
        </div>
        <Button variant="ghost" onClick={() => { setInspector(null); setResult(null); setCode(''); }} className="text-slate-400 hover:text-red-400">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </header>

      <main className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto">
        {!result ? (
          <div className="w-full space-y-6 mt-8">
            <div className="text-center">
              <Search className="w-16 h-16 text-blue-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Validate Ticket</h2>
              <p className="text-slate-400 mt-1">Enter the 8-character code shown on the customer's ticket</p>
            </div>
            <Input placeholder="e.g. A1B2C3D4" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && validate()}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 h-16 text-center text-2xl font-mono tracking-widest" />
            <Button onClick={validate} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-xl">
              Validate Ticket
            </Button>
          </div>
        ) : (
          <div className="w-full mt-8 text-center space-y-6">
            {result.valid ? (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-2xl p-8">
                <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-4" />
                <h2 className="text-5xl font-black text-green-400">VALID</h2>
                <p className="text-green-300 text-2xl mt-3 capitalize">{result.ticket.type} Ticket</p>
                <p className="text-slate-400 mt-1">{result.ticket.credits_paid} credits</p>
                <p className="text-slate-500 text-sm mt-2">Purchased: {new Date(result.ticket.purchased_at).toLocaleString()}</p>
              </div>
            ) : (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-2xl p-8">
                <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
                <h2 className="text-5xl font-black text-red-400">INVALID</h2>
                <p className="text-red-300 text-xl mt-3">{result.reason}</p>
                {result.ticket && <p className="text-slate-400 text-sm mt-2 capitalize">{result.ticket.type} — {result.ticket.status}</p>}
              </div>
            )}
            <Button onClick={reset} variant="outline" className="w-full h-14 text-lg border-slate-600 text-slate-300 hover:bg-slate-800">
              Check Another Ticket
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}