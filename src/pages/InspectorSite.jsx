import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, LogOut, Search, ShieldAlert, History, Clock } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';
import { toast } from 'sonner';
import { getUnifiedSession, clearUnifiedSession } from '@/utils/unifiedAuth';
import { ticketState } from '@/utils/ticketActivation';
import ScanView from '@/components/scanner/ScanView';

export default function InspectorSite() {
  const [step, setStep] = useState(() => {
    const s = getUnifiedSession();
    return (s && s.role === 'inspector') ? 'active' : 'username';
  });
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [inspector, setInspector] = useState(() => {
    const s = getUnifiedSession();
    return (s && s.role === 'inspector') ? s.identity : null;
  });
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [localScans, setLocalScans] = useState([]);
  const [panel, setPanel] = useState('scan'); // 'scan' | 'fine'
  const [fineForm, setFineForm] = useState({ name: '', dob: '', ssn: '', phone: '', email: '', address: '', zip: '', city: '', reason: 'No Valid Ticket', busline: '', tripID: '' });
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });
  const { data: tickets = [], refetch } = useQuery({ queryKey: ['all-tickets'], queryFn: () => base44.entities.Ticket.list('-purchased_at', 1000), enabled: !!inspector });

  const markUsed = useMutation({
    mutationFn: id => base44.entities.Ticket.update(id, { status: 'used', used_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tickets'] })
  });

  const forceOverride = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.Ticket.update(id, { status: 'used', used_at: new Date().toISOString(), notes: `OVERRIDE by ${inspector.name}: ${reason}` }),
    onSuccess: (updated) => { toast.success('Manual override applied'); addLog(updated, 'Override'); setResult({ valid: true, ticket: updated, msg: `Override: ${overrideReason}` }); setOverrideReason(''); qc.invalidateQueries({ queryKey: ['all-tickets'] }); }
  });

  const issueFine = useMutation({
    mutationFn: data => base44.entities.Fine.create({ ...data, issued_by: inspector.name, issued_by_id: inspector.id, amount_kr: 1150, status: 'unpaid', issued_at: new Date().toISOString() }),
    onSuccess: () => { toast.success('Digital fine issued!'); setFineForm({ name: '', dob: '', ssn: '', phone: '', email: '', address: '', zip: '', city: '', reason: 'No Valid Ticket', busline: '', tripID: '' }); setPanel('scan'); }
  });

  const loginStep = () => { if (!username.trim()) { toast.error('Enter username'); return; } setStep('code'); };
  const loginWithCode = () => {
    const found = inspectors.find(i => i.username?.toLowerCase() === username.trim().toLowerCase() && i.access_code === accessCode.trim() && i.is_active !== false);
    if (found) { setInspector(found); setStep('active'); toast.success(`Welcome, ${found.name}!`); }
    else toast.error('Invalid credentials');
  };

  const addLog = (ticket, status) => {
    setLocalScans(prev => [{ code: ticket?.short_code || code, passenger: ticket?.customer_name || 'Unknown', type: ticket?.type || '—', status, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
  };

  const handleScan = async (qr) => {
    const token = String(qr).trim();
    const list = await base44.entities.Ticket.filter({ qr_token: token });
    const ticket = list[0];
    if (!ticket) { setResult({ valid: false, reason: 'Billett ikke funnet' }); addLog(null, 'Ikke funnet'); return; }
    const now = new Date();
    const st = ticketState(ticket, now);
    if (st === 'active') {
      const msg = ticket.ticket_category === 'period'
        ? `Periodebillett — gyldig til ${new Date(ticket.valid_until).toLocaleDateString('nb-NO')}`
        : `Gyldig — aktivert ${ticket.activated_at ? new Date(ticket.activated_at).toLocaleTimeString('nb-NO') : ''}`;
      setResult({ valid: true, ticket, msg });
      addLog(ticket, 'Gyldig');
    } else if (st === 'inactive') {
      setResult({ valid: false, reason: 'IKKE AKTIVERT — må skannes av sjåfør først', ticket });
      addLog(ticket, 'Ikke aktivert');
    } else if (st === 'used') {
      setResult({ valid: false, reason: 'Allerede brukt', ticket });
      addLog(ticket, 'Brukt');
    } else {
      setResult({ valid: false, reason: 'Utgått', ticket });
      addLog(ticket, 'Utgått');
    }
  };

  const genTripID = () => {
    const d = new Date(); const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth()+1).padStart(2,'0'); const yyyy = d.getFullYear();
    const route = (fineForm.busline || 'R000').replace(/\s/g,'').toUpperCase().padEnd(4,'X').substring(0,4);
    const rand = Math.random().toString(36).substring(2,6).toUpperCase();
    setFineForm(f => ({ ...f, tripID: `${dd}${mm}${yyyy}-${route}-${rand}` }));
  };

  const reset = () => { setCode(''); setResult(null); refetch(); };
  const logout = () => { clearUnifiedSession(); setInspector(null); setStep('username'); setUsername(''); setAccessCode(''); setCode(''); setResult(null); setLocalScans([]); };

  // Auto-advance to the next passenger after 5s for all results.
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => { setCode(''); setResult(null); }, 5000);
    return () => clearTimeout(t);
  }, [result]);

  if (step === 'username') return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-slate-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center"><LSTLogo size={56} className="mx-auto mb-4" /><h1 className="text-xl font-black text-white">Inspector Portal</h1><p className="text-slate-500 text-sm mt-1">Enter your username</p></div>
        <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginStep()} className="bg-[#0a0a0a] border-slate-700 text-white h-12 text-center text-lg" />
        <Button onClick={loginStep} className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">Next →</Button>
      </div>
    </div>
  );

  if (step === 'code') return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-slate-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center"><div className="text-4xl mb-3">🔐</div><h1 className="text-xl font-black text-white">Access Code</h1><p className="text-slate-400 text-sm">Welcome, <span className="text-[#c0392b] font-bold">{username}</span></p></div>
        <Input type="password" placeholder="Access Code" value={accessCode} onChange={e => setAccessCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginWithCode()} className="bg-[#0a0a0a] border-slate-700 text-white h-14 text-center text-2xl font-mono tracking-widest" />
        <div className="flex gap-3"><Button variant="outline" onClick={() => setStep('username')} className="flex-1 border-slate-700 text-slate-300">← Back</Button><Button onClick={loginWithCode} className="flex-1 h-12 bg-[#c0392b] hover:bg-[#a93226]">Login</Button></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#111] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2"><LSTLogo size={28} /><div><p className="font-bold text-sm text-white">{inspector.name}</p><p className="text-slate-500 text-xs">@{inspector.username}</p></div></div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-red-400"><LogOut className="w-4 h-4" /></Button>
        </div>
        <div className="p-3 flex gap-2">
          <button onClick={() => { setPanel('scan'); setResult(null); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${panel === 'scan' ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-400'}`}>📋 Scan</button>
          <button onClick={() => setPanel('fine')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${panel === 'fine' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400'}`}>⚠️ Fine</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-[10px] text-slate-600 font-bold tracking-wider uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Session Log ({localScans.length})</p>
          {localScans.length === 0 ? <p className="text-slate-700 text-xs text-center py-6">No scans yet</p> :
            localScans.map((l, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-slate-900 rounded-lg p-2 text-xs">
                <div className="flex justify-between font-mono"><span className="text-slate-300 font-bold">{l.code}</span><span className="text-slate-700">{l.time}</span></div>
                <div className="flex justify-between mt-0.5"><span className="text-slate-500 capitalize">{l.type}</span><span className={`font-bold text-[10px] ${l.status === 'Valid' ? 'text-green-400' : l.status === 'Override' ? 'text-orange-400' : 'text-red-400'}`}>{l.status}</span></div>
              </div>
            ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {panel === 'scan' ? (
          <div className="w-full max-w-md space-y-6">
            {!result ? (
              <div className="text-center space-y-5">
                <Search className="w-16 h-16 text-[#c0392b] mx-auto" />
                <h2 className="text-2xl font-black">Valider billett</h2>
                <p className="text-slate-500 text-sm">Skann passasjerens QR-kode</p>
                <ScanView onScan={handleScan} placeholder="QR-token eller kode" />
                <p className="text-slate-700 text-xs">{tickets.length} billetter lastet</p>
              </div>
            ) : (
              <div className="space-y-5 text-center">
                {result.valid ? (
                  <div className="bg-green-950/40 border-2 border-green-500 rounded-3xl p-8 space-y-3">
                    <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto" />
                    <h2 className="text-5xl font-black text-green-400">VALID</h2>
                    <p className="text-green-200 text-xl capitalize">{result.ticket?.type} — {result.ticket?.ticket_category}</p>
                    <p className="text-slate-300 text-sm">{result.msg}</p>
                    {result.ticket?.customer_name && <p className="text-slate-400 text-xs">Passenger: {result.ticket.customer_name}</p>}
                  </div>
                ) : (
                  <div className="bg-red-950/40 border-2 border-red-500 rounded-3xl p-8 space-y-3">
                    <XCircle className="w-20 h-20 text-red-400 mx-auto" />
                    <h2 className="text-5xl font-black text-red-400">INVALID</h2>
                    <p className="text-red-300 text-lg">{result.reason}</p>
                    {result.ticket && (
                      <div className="border-t border-slate-700 pt-4 space-y-2 text-left">
                        <p className="text-slate-400 text-xs text-center">Force override if device/scanner failure:</p>
                        <Input placeholder="Override reason" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
                        <Button onClick={() => forceOverride.mutate({ id: result.ticket.id, reason: overrideReason })} disabled={forceOverride.isPending || !overrideReason.trim()} className="w-full bg-orange-600 hover:bg-orange-700 text-sm font-bold">🔓 Force Manual Override</Button>
                      </div>
                    )}
                  </div>
                )}
                <Button onClick={reset} variant="outline" className="w-full h-12 border-slate-700 text-slate-300">← Check Another Ticket</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-lg bg-[#111] border border-red-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-8 h-8 text-red-400" />
              <div><h2 className="text-xl font-black text-white">Digital Penalty Fare</h2><p className="text-slate-500 text-xs">Fine of 1,150 kr will be issued</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs text-slate-400">Full Name *</Label><Input value={fineForm.name} onChange={e => setFineForm(f => ({ ...f, name: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">Date of Birth</Label><Input placeholder="DD.MM.YYYY" value={fineForm.dob} onChange={e => setFineForm(f => ({ ...f, dob: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">SSN / Personnummer</Label><Input placeholder="11 digits" value={fineForm.ssn} onChange={e => setFineForm(f => ({ ...f, ssn: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">Phone *</Label><Input value={fineForm.phone} onChange={e => setFineForm(f => ({ ...f, phone: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div className="col-span-2"><Label className="text-xs text-slate-400">Email</Label><Input value={fineForm.email} onChange={e => setFineForm(f => ({ ...f, email: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div className="col-span-2"><Label className="text-xs text-slate-400">Address</Label><Input value={fineForm.address} onChange={e => setFineForm(f => ({ ...f, address: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">Zip</Label><Input value={fineForm.zip} onChange={e => setFineForm(f => ({ ...f, zip: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">City</Label><Input value={fineForm.city} onChange={e => setFineForm(f => ({ ...f, city: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">Bus Line</Label><Input placeholder="e.g. Route 10" value={fineForm.busline} onChange={e => setFineForm(f => ({ ...f, busline: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
              <div><Label className="text-xs text-slate-400">Trip ID</Label><div className="flex gap-1 mt-1"><Input value={fineForm.tripID} readOnly className="bg-[#0a0a0a] border-slate-700 text-white text-xs font-mono flex-1" /><Button size="sm" onClick={genTripID} className="bg-slate-700 hover:bg-slate-600 text-xs">Gen</Button></div></div>
              <div className="col-span-2"><Label className="text-xs text-slate-400">Reason</Label><Input value={fineForm.reason} onChange={e => setFineForm(f => ({ ...f, reason: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" /></div>
            </div>
            <Button onClick={() => { if (!fineForm.name || !fineForm.phone || !fineForm.tripID) { toast.error('Name, Phone, and Trip ID are required'); return; } issueFine.mutate(fineForm); }} disabled={issueFine.isPending} className="w-full bg-red-700 hover:bg-red-800 font-bold h-12">
              🚨 Issue Digital Fine — 1,150 kr
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}