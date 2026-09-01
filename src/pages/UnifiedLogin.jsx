import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LSTLogo from '@/components/LSTLogo';
import { detectRole, ROLE_META, ROLE_ROUTES, setUnifiedSession } from '@/utils/unifiedAuth';
import { setCustomerSession } from '@/utils/customerAuth';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, ChevronRight } from 'lucide-react';

function genAccessPin() {
  let p = '';
  for (let i = 0; i < 12; i++) p += Math.floor(Math.random() * 10);
  return p;
}

// Each authenticator verifies credentials, stores the unified session (+ any
// portal-native session marker), and returns the route to navigate to.
async function authDriver(username, accessCode) {
  const all = await base44.entities.BusDriver.list();
  const d = all.find(x =>
    x.username?.toLowerCase() === username.toLowerCase() &&
    x.access_code === accessCode.trim() &&
    x.is_active !== false
  );
  if (!d) throw new Error('Ugyldig brukernavn eller tilgangskode');
  setUnifiedSession({ role: 'driver', identity: d });
  return { route: ROLE_ROUTES.driver };
}

async function authInspector(badgeId, pin) {
  const all = await base44.entities.Inspector.list();
  const ins = all.find(x =>
    x.badge_id?.toLowerCase() === badgeId.toLowerCase() &&
    x.pin === pin.trim() &&
    x.is_active !== false
  );
  if (!ins) throw new Error('Ugyldig skilt-ID eller PIN');
  setUnifiedSession({ role: 'inspector', identity: ins });
  return { route: ROLE_ROUTES.inspector };
}

async function authTvm(machineId, accessPin) {
  const all = await base44.entities.MachineAccount.list();
  const m = all.find(x => x.machine_id === machineId.toUpperCase() && x.is_active !== false);
  if (!m) throw new Error('Maskin ikke funnet eller inaktiv');
  if (m.force_locked) throw new Error('Maskinen er sperret av admin');
  if (String(m.access_pin) !== String(accessPin).trim()) throw new Error('Feil tilgangs-PIN');
  const token = genAccessPin();
  await base44.entities.MachineAccount.update(m.id, { session_token: token });
  const session = { ...m, session_token: token };
  sessionStorage.setItem('transit_machine_session', JSON.stringify(session));
  setUnifiedSession({ role: 'tvm', identity: session });
  return { route: ROLE_ROUTES.tvm };
}

async function authAdmin(username, password) {
  const creds = { admin: 'admin' };
  const u = username.toLowerCase();
  if (u === 'root') throw new Error('Root-admin: bruk /root direkte');
  if (!creds[u] || creds[u] !== password) throw new Error('Feil admin-bruker eller passord');
  sessionStorage.setItem('admin_auth', 'true');
  setUnifiedSession({ role: 'admin', identity: { username: u } });
  return { route: ROLE_ROUTES.admin };
}

async function authPassenger(id, password) {
  const isEmail = id.includes('@');
  const list = isEmail
    ? await base44.entities.Customer.filter({ email: id.toLowerCase().trim() })
    : await base44.entities.Customer.filter({ phone: id.trim() });
  const c = list.find(x => x.password === password);
  if (!c) throw new Error('Feil telefon/e-post eller passord');
  const full = await base44.entities.Customer.filter({ id: c.id });
  const record = full[0] || c;
  setCustomerSession(record);
  setUnifiedSession({ role: 'passenger', identity: { id: record.id } });
  return { route: ROLE_ROUTES.passenger, customer: record };
}

export default function UnifiedLogin({ onPassengerAuth }) {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState('id');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { role, id } = detectRole(identifier);
  const meta = ROLE_META[role] || ROLE_META.passenger;

  const next = () => {
    if (!identifier.trim()) { toast.error('Skriv inn brukernavn eller telefon'); return; }
    setError('');
    setStep('pass');
  };

  const back = () => { setStep('id'); setPassword(''); setError(''); };

  const submit = async () => {
    if (!password.trim()) { toast.error('Skriv inn passord'); return; }
    setError('');
    setLoading(true);
    try {
      let result;
      switch (role) {
        case 'driver':    result = await authDriver(id, password); break;
        case 'inspector': result = await authInspector(id, password); break;
        case 'tvm':       result = await authTvm(id, password); break;
        case 'admin':     result = await authAdmin(id, password); break;
        default:          result = await authPassenger(id, password);
      }
      if (role === 'passenger' && onPassengerAuth && result.customer) {
        onPassengerAuth(result.customer);
      } else {
        navigate(result.route, { replace: true });
      }
    } catch (e) {
      setError(e.message || 'Innlogging feilet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <LSTLogo size={64} className="mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white tracking-tight">LOS SANTOS TRANSIT</h1>
          <p className="text-slate-500 text-sm mt-1">Én innlogging — alle systemer</p>
        </div>

        <div className="bg-[#111] border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Live role badge */}
          {identifier.trim() && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-2xl">{meta.icon}</span>
              <span className="font-bold" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          )}

          {step === 'id' ? (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Brukernavn / Telefon</label>
                <Input
                  autoFocus
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  placeholder="DRVR- · INSP- · TVM- · ADM · telefon"
                  className="bg-[#0a0a0a] border-slate-700 text-white h-12 text-center font-mono tracking-wide"
                />
              </div>
              <Button onClick={next} className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">
                Neste <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                <p><span className="font-mono text-slate-500">DRVR-brukernavn</span> — sjåfør</p>
                <p><span className="font-mono text-slate-500">INSP-skiltID</span> — inspektør</p>
                <p><span className="font-mono text-slate-500">TVM-maskinID</span> — billettautomat</p>
                <p><span className="font-mono text-slate-500">ADM</span> — administrator</p>
                <p><span className="font-mono text-slate-500">telefon/e-post</span> — passasjer</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-3xl mb-1">{meta.icon}</div>
                <p className="text-slate-400 text-xs">{meta.label}</p>
                <p className="text-[#c0392b] font-bold font-mono text-sm break-all">{identifier}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">{meta.passLabel}</label>
                <Input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder={meta.passPlaceholder}
                  className="bg-[#0a0a0a] border-slate-700 text-white h-12 text-center font-mono tracking-widest"
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={back} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button onClick={submit} disabled={loading} className="flex-1 h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logger inn...</> : 'Logg inn'}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 flex items-center justify-center gap-1">
          Systemet gjenkjenner rollen din automatisk <ChevronRight className="w-3 h-3" />
        </p>
      </div>
    </div>
  );
}