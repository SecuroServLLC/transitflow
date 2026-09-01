import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, LogOut, Search, Bus, Clock, AlertTriangle, User } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';
import { toast } from 'sonner';
import { getUnifiedSession, clearUnifiedSession } from '@/utils/unifiedAuth';
import { ticketState, activateTicket, isFrozen, frozenRemaining, markScanned } from '@/utils/ticketActivation';
import ScanView from '@/components/scanner/ScanView';

export default function DriverPortal() {
  const [step, setStep] = useState(() => {
    const s = getUnifiedSession();
    return (s && s.role === 'driver') ? 'validate' : 'login';
  });
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [driver, setDriver] = useState(() => {
    const s = getUnifiedSession();
    return (s && s.role === 'driver') ? s.identity : null;
  });
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

  const handleScan = async (qr) => {
    const val = String(qr).trim();
    // Scanning the passenger's app QR -> show their unused tickets to activate.
    if (val.startsWith('CUST:')) return openCustomer(val.slice(5));
    const list = await base44.entities.Ticket.filter({ qr_token: val });
    const ticket = list[0];
    if (!ticket) { setResult({ valid: false, reason: 'Billett ikke funnet' }); addLog(null, 'Ikke funnet'); return; }
    const now = new Date();
    if (ticket.ticket_category === 'period') {
      const valid = ticket.valid_until && new Date(ticket.valid_until) >= now;
      setResult({ valid, ticket, msg: valid ? `Periodebillett — gyldig til ${new Date(ticket.valid_until).toLocaleDateString('nb-NO')}` : 'Periodebillett utgått' });
      addLog(ticket, valid ? 'Gyldig' : 'Utgått'); return;
    }
    const st = ticketState(ticket, now);
    if (isFrozen(ticket, now)) {
      setResult({ valid: false, reason: `Frossen — vent ${frozenRemaining(ticket, now)}s`, ticket });
      addLog(ticket, 'Frossen'); return;
    }
    if (st === 'inactive') {
      const updated = await activateTicket(ticket);
      setResult({ valid: true, ticket: updated, msg: 'AKTIVERT — gyldig 5 min', activated: true });
      addLog(updated, 'Aktivert');
    } else if (st === 'active') {
      const updated = await markScanned(ticket);
      setResult({ valid: true, ticket: updated, msg: `Allerede aktiv — gyldig til ${new Date(updated.valid_until).toLocaleTimeString('nb-NO')}` });
      addLog(updated, 'Allerede aktiv');
    } else {
      const reason = st === 'used' ? 'Allerede brukt' : 'Utgått';
      setResult({ valid: false, reason, ticket });
      addLog(ticket, reason);
    }
  };

  const openCustomer = async (customerId) => {
    try {
      const customer = await base44.entities.Customer.get(customerId);
      const unused = await base44.entities.Ticket.filter({ customer_id: customerId, status: 'unused' }, '-purchased_at', 50);
      const tickets = unused.filter(t => t.ticket_category === 'single');
      setResult({ type: 'customer', customer, tickets });
    } catch {
      setResult({ valid: false, reason: 'Kunde ikke funnet' });
    }
  };

  const activateFromCustomer = async (ticket) => {
    const now = new Date();
    if (isFrozen(ticket, now)) { toast.error(`Frossen — vent ${frozenRemaining(ticket, now)}s`); return; }
    const updated = await activateTicket(ticket);
    setResult({ valid: true, ticket: updated, msg: 'AKTIVERT — gyldig 5 min', activated: true });
    addLog(updated, 'Aktivert');
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
  const logout = () => { clearUnifiedSession(); setDriver(null); setStep('login'); setResult(null); setLocalScans([]); };

  // Auto-advance to the next passenger after 5s for final results.
  // The interactive customer list (with unused tickets) is excluded — the driver must pick.
  useEffect(() => {
    if (!result) return;
    if (result.type === 'customer' && result.tickets?.length > 0) return;
    const t = setTimeout(() => { setResult(null); setCode(''); }, 5000);
    return () => clearTimeout(t);
  }, [result]);

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
              <h2 className="text-2xl font-black">Aktiver billett</h2>
              <p className="text-slate-500 text-sm">Skann passasjerens QR-kode for å aktivere (gyldig 5 min)</p>
              <ScanView onScan={handleScan} placeholder="QR-token eller kode" />
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4 text-center">
              {result.type === 'customer' ? (
                <div className="space-y-3 text-left">
                  <div className="bg-blue-950/40 border-2 border-blue-500 rounded-3xl p-6 text-center">
                    <User className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                    <h2 className="text-xl font-black text-blue-300">{result.customer?.name || 'Kunde'}</h2>
                    <p className="text-slate-400 text-sm">{result.customer?.phone || ''}</p>
                    <p className="text-slate-500 text-xs mt-2">{result.tickets?.length || 0} ubrukte billetter</p>
                  </div>
                  {result.tickets?.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Ingen ubrukte billetter</p>}
                  {result.tickets?.map(t => (
                    <div key={t.id} className="bg-[#111] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white capitalize">{t.type} · {t.ticket_category}</p>
                        <p className="text-slate-500 text-xs font-mono">{t.short_code}</p>
                      </div>
                      <Button size="sm" onClick={() => activateFromCustomer(t)} className="bg-[#c0392b] hover:bg-[#a93226]">Aktiver</Button>
                    </div>
                  ))}
                </div>
              ) : result.valid ? (
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