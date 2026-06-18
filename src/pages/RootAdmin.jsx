import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skull, Trash2, AlertTriangle, CheckSquare, Square } from 'lucide-react';

const ENTITIES = [
  { key: 'Location',      label: 'Lokasjoner',      color: 'text-orange-600' },
  { key: 'MachineAccount',label: 'Maskiner',         color: 'text-orange-600' },
  { key: 'CashBalance',   label: 'Kassesaldoer',     color: 'text-yellow-600' },
  { key: 'Inspector',     label: 'Inspektører',      color: 'text-red-500' },
  { key: 'BusDriver',     label: 'Sjåfører',         color: 'text-red-500' },
  { key: 'CashierAccount',label: 'Kasserere',        color: 'text-red-500' },
  { key: 'Customer',      label: 'Kunder',           color: 'text-red-700' },
  { key: 'Ticket',        label: 'Billetter',        color: 'text-red-700' },
  { key: 'Transaction',   label: 'Transaksjoner',    color: 'text-red-700' },
  { key: 'Fine',          label: 'Bøter',            color: 'text-red-700' },
  { key: 'TransitCard',   label: 'TransitKort',      color: 'text-red-700' },
  { key: 'CardBatch',     label: 'Kortpakker',       color: 'text-red-700' },
  { key: 'OneTimeCard',   label: 'Engangskoder',     color: 'text-red-700' },
  { key: 'Retailer',      label: 'Forhandlere',      color: 'text-orange-600' },
  { key: 'Partner',       label: 'Partnere',         color: 'text-orange-600' },
  { key: 'Pricing',       label: 'Priser',           color: 'text-yellow-600' },
  { key: 'Fee',           label: 'Gebyrer',          color: 'text-yellow-600' },
  { key: 'ServiceMessage',label: 'Servicemeldinger', color: 'text-yellow-600' },
  { key: 'GroupRide',     label: 'Gruppereis',       color: 'text-yellow-600' },
];

export default function RootAdmin() {
  const [auth, setAuth] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState({});
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [log, setLog] = useState([]);
  const qc = useQueryClient();

  const login = () => {
    if (user === 'root' && pass === 'root') { setAuth(true); loadCounts(); }
    else setLoginError('Feil brukernavn eller passord');
  };

  const loadCounts = async () => {
    const results = {};
    for (const e of ENTITIES) {
      try {
        const items = await base44.entities[e.key].list();
        results[e.key] = items.length;
      } catch { results[e.key] = '?'; }
    }
    setCounts(results);
  };

  const toggleAll = (val) => {
    const s = {};
    ENTITIES.forEach(e => s[e.key] = val);
    setSelected(s);
  };

  const deleteSelected = async () => {
    if (confirm !== 'SLETT ALT') return;
    setDeleting(true);
    const newLog = [];
    for (const e of ENTITIES) {
      if (!selected[e.key]) continue;
      try {
        const items = await base44.entities[e.key].list();
        for (const item of items) {
          await base44.entities[e.key].delete(item.id);
        }
        newLog.push(`✅ Slettet ${items.length} ${e.label}`);
      } catch (err) {
        newLog.push(`❌ Feil ved ${e.label}: ${err.message}`);
      }
      setLog([...newLog]);
    }
    setDeleting(false);
    setConfirm('');
    loadCounts();
    qc.invalidateQueries();
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-[#0a0a0a] border border-red-900 rounded-2xl p-8 w-80 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Skull className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-white font-black text-xl tracking-widest">ROOT</h1>
              <p className="text-red-600 text-xs tracking-widest">FARLIG OMRÅDE</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs">Denne siden gir tilgang til bulk-sletting av data. Bruk med ekstrem forsiktighet.</p>
          <Input value={user} onChange={e => setUser(e.target.value)} placeholder="Brukernavn" className="bg-black border-slate-700 text-white" />
          <Input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Passord" className="bg-black border-slate-700 text-white" />
          {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
          <Button onClick={login} className="w-full bg-red-800 hover:bg-red-700 font-bold">Logg inn</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skull className="w-7 h-7 text-red-600" />
            <div>
              <h1 className="font-black text-2xl tracking-widest text-white">ROOT ADMIN</h1>
              <p className="text-red-600 text-xs tracking-widest">DESTRUKTIVE OPERASJONER</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:text-white" onClick={loadCounts}>🔄 Oppdater tellinger</Button>
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:text-white" onClick={() => setAuth(false)}>Logg ut</Button>
          </div>
        </div>

        <div className="bg-red-950 border border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">Sletting er permanent og kan ikke angres. Velg entiteter nedenfor og bekreft med "SLETT ALT" for å fortsette.</p>
        </div>

        <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="font-bold text-sm">Velg entiteter å slette</span>
            <div className="flex gap-3">
              <button className="text-xs text-blue-400 hover:text-blue-300" onClick={() => toggleAll(true)}>Velg alle</button>
              <button className="text-xs text-slate-400 hover:text-white" onClick={() => toggleAll(false)}>Fjern alle</button>
            </div>
          </div>
          <div className="divide-y divide-slate-900">
            {ENTITIES.map(e => (
              <label key={e.key} className="flex items-center justify-between px-4 py-3 hover:bg-slate-900 cursor-pointer">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelected(s => ({ ...s, [e.key]: !s[e.key] }))} className="text-slate-400 hover:text-white">
                    {selected[e.key] ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                  </button>
                  <span className={`font-medium ${selected[e.key] ? 'text-white' : 'text-slate-400'}`}>{e.label}</span>
                </div>
                <span className={`font-mono text-sm font-bold ${e.color}`}>
                  {counts[e.key] !== undefined ? `${counts[e.key]} poster` : '...'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {Object.values(selected).some(Boolean) && (
          <div className="bg-[#0a0a0a] border border-red-900 rounded-xl p-4 space-y-3">
            <p className="text-red-400 text-sm font-bold">⚠️ Du er i ferd med å slette {Object.values(selected).filter(Boolean).length} entitetstyper. Skriv <code className="bg-red-950 px-1 rounded">SLETT ALT</code> for å bekrefte:</p>
            <Input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="SLETT ALT" className="bg-black border-red-800 text-white font-mono" />
            <Button onClick={deleteSelected} disabled={confirm !== 'SLETT ALT' || deleting}
              className="w-full bg-red-700 hover:bg-red-600 font-black text-lg h-12 disabled:opacity-30">
              <Trash2 className="w-5 h-5 mr-2" /> {deleting ? 'Sletter...' : 'SLETT VALGTE ENTITETER'}
            </Button>
          </div>
        )}

        {log.length > 0 && (
          <div className="bg-[#0a0a0a] border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-2 font-bold">LOGG</p>
            <div className="space-y-1 font-mono text-sm max-h-64 overflow-y-auto">
              {log.map((l, i) => <p key={i} className={l.startsWith('✅') ? 'text-green-400' : 'text-red-400'}>{l}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}