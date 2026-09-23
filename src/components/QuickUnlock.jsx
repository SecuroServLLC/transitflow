import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LSTLogo from '@/components/LSTLogo';
import { Loader2, ArrowLeft } from 'lucide-react';
import { ROLE_META } from '@/utils/unifiedAuth';

// PIN/code-only unlock screen for a remembered identity.
// onSubmit(secret) should throw on failure; on success the parent sets the
// unlocked flag + active session itself.
export default function QuickUnlock({ role, name, onSubmit, onSwitch }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const meta = ROLE_META[role] || ROLE_META.passenger;

  const submit = async () => {
    if (!secret.trim()) { setError('Skriv inn kode'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit(secret.trim());
    } catch (e) {
      setError(e.message || 'Feil kode');
      setSecret('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <LSTLogo size={52} className="mx-auto mb-3" />
        <div className="text-3xl mb-1">{meta.icon}</div>
        <p className="text-slate-400 text-sm">{meta.label}</p>
        {name && <p className="text-white font-bold mt-0.5">{name}</p>}
      </div>

      <div className="bg-[#111] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">{meta.passLabel}</label>
          <Input
            type="password"
            autoFocus
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={meta.passPlaceholder}
            className="bg-[#0a0a0a] border-slate-700 text-white h-14 text-center text-2xl font-mono tracking-widest"
          />
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <Button onClick={submit} disabled={loading} className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Låser opp…</> : 'Lås opp'}
        </Button>
        <button onClick={onSwitch} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 pt-1">
          <ArrowLeft className="w-3 h-3" /> Bytt bruker
        </button>
      </div>
    </div>
  );
}