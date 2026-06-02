import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, LogOut, Search, Bus, Clock, AlertTriangle } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';
import { toast } from 'sonner';

export default function DriverPortal() {
  const [step, setStep] = useState('login');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [driver, setDriver] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [localScans, setLocalScans] = useState([]);
  const qc = useQueryClient();

  const { data: drivers = [] } = useQuery({
    queryKey: ['bus-drivers'],
    queryFn: () => base44.entities.BusDriver.list(),
    enabled: step === 'login'
  });

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ['all-tickets'],
    queryFn: () => base44.entities.Ticket.list('-purchased_at', 1000),
    enabled: !!driver
  });

  const markUsed = useMutation({
    mutationFn: id => base44.entities.Ticket.update(id, { status: 'used', used_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tickets'] })
  });

  const login = () => {
    const found = drivers.find(d =>
      d.username?.toLowerCase() === username.trim().toLowerCase() &&
      d.access_code === accessCode.trim() &&
      d.is_active !== false
    );
    if (found) { setDriver(found); setStep('validate'); toast.success(`Welcome, ${found.name}!`); }
    else toast.error('Invalid credentials');
  };

  const validate = () => {
    const q = code.trim().toUpperCase();
    if (!q) return;
    const ticket = tickets.find(t =>
      t.short_code?.toUpperCase() === q ||
      t.ticket_id?.toUpperCase() === q
    );
    if (!ticket) { setResult({ valid: false, reason: 'Not found' }); addLog(null, 'Not Found'); return; }
    const now = new Date();
    if (ticket.ticket_category === 'period') {
      const valid = ticket.valid_until && new Date(ticket.valid_until) >= now;
      const r = { valid, ticket, msg: valid ? `Period pass valid until ${new Date(ticket.valid_until).toLocaleDateString()}` : 'Period pass expired' };
      setResult(r); addLog(ticket, valid ? 'Valid' : 'Expired'); return;
    }
    if (ticket.status === 'used') { setResult({ valid: false, reason: 'Already used', ticket }); addLog(ticket, 'Duplicate'); return; }
    if (ticket.status === 'expired') { setResult({ valid: false, reason: 'Expired', ticket }); addLog(ticket, 'Expired'); return; }
    markUsed.mutate(ticket.id);
    setResult({ valid: true, ticket, msg: 'Single ticket accepted ✓' });
    addLog(ticket, 'Accepted');
  };

  const addLog = (ticket, status) => {
    setLocalScans(prev => [{
      code: ticket?.short_code || code,
      passenger: ticket?.customer_name || 'Unknown',
      type: ticket?.type || '—',
      status,
      time: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 20));
  };

  const reset = () => { setCode(''); setResult(null); refetch(); };
  const logout = () => { setDriver(null); setStep('login'); setResult(null); setLocalScans([]); };

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] border border-slate-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
          <div className="text-center">
            <LSTLogo size={56} className="mx-auto mb-4" />
            <h1 className="text-xl font-black text-white">Driver Portal</h1>
            <p className="text-slate-500 text-sm mt-1">Bus Driver Login</p>
          </div>
          <div className="space-y-3">
            <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="bg-[#0a0a0a] border-slate-700 text-white h-12" />
            <Input type="password" placeholder="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} className="bg-[#0a0a0a] border-slate-700 text-white h-12 font-mono tracking-widest" />
            <Button onClick={login} className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="bg-[#111] border-b border-[#c0392b]/30 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LSTLogo size={32} />
          <div>
            <p className="font-bold text-sm">{driver.name}</p>
            <p className="text-slate-500 text-xs">{driver.route || 'No route assigned'} · Driver</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-red-400">
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Scan Panel */}
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          {!result ? (
            <div className="w-full max-w-sm space-y-5 text-center">
              <Bus className="w-16 h-16 text-[#c0392b] mx-auto" />
              <h2 className="text-2xl font-black">Validate Boarding</h2>
              <p className="text-slate-500 text-sm">Enter the passenger's ticket code</p>
              <Input placeholder="Short code or Ticket ID" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && validate()} className="bg-[#111] border-slate-700 text-white text-center text-xl font-mono h-16 tracking-widest" />
              <Button onClick={validate} className="w-full h-14 bg-[#c0392b] hover:bg-[#a93226] text-lg font-bold">
                <Search className="w-5 h-5 mr-2" /> Validate
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4 text-center">
              {result.valid ? (
                <div className="bg-green-950/40 border-2 border-green-500 rounded-3xl p-8">
                  <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-3" />
                  <h2 className="text-5xl font-black text-green-400">BOARD</h2>
                  <p className="text-green-200 capitalize mt-2">{result.ticket.type} — {result.ticket.ticket_category}</p>
                  <p className="text-slate-300 text-sm mt-1">{result.msg}</p>
                  {result.ticket.customer_name && <p className="text-slate-400 text-xs mt-1">{result.ticket.customer_name}</p>}
                </div>
              ) : (
                <div className="bg-red-950/40 border-2 border-red-500 rounded-3xl p-8">
                  <XCircle className="w-20 h-20 text-red-400 mx-auto mb-3" />
                  <h2 className="text-5xl font-black text-red-400">DENY</h2>
                  <p className="text-red-300 text-lg mt-2">{result.reason}</p>
                </div>
              )}
              <Button onClick={reset} variant="outline" className="w-full h-12 border-slate-700 text-slate-300">← Next Passenger</Button>
            </div>
          )}
        </main>

        {/* Scan Log */}
        <aside className="w-full md:w-72 bg-[#111] border-t md:border-t-0 md:border-l border-slate-800 p-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Boarding Log
          </h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {localScans.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-8">No passengers boarded yet</p>
            ) : localScans.map((l, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-slate-800 rounded-lg p-2.5 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-300 font-bold">{l.code}</span>
                  <span className="text-slate-600">{l.time}</span>
                </div>
                <div className="flex justify-between mt-0.5 text-slate-400">
                  <span className="capitalize">{l.type} · {l.passenger}</span>
                  <span className={`font-bold ${l.status === 'Accepted' || l.status === 'Valid' ? 'text-green-400' : 'text-red-400'}`}>{l.status}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}