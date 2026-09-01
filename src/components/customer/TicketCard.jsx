import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Zap, Clock } from 'lucide-react';
import { ticketState, activateTicket, formatRemaining } from '@/utils/ticketActivation';

const TYPE_EMOJI = { adult: '🧑', child: '👶', senior: '👴', student: '🎓', military: '🪖' };
const TYPE_LABEL = { adult: 'Adult', child: 'Child', senior: 'Senior', student: 'Student', military: 'Military' };

const CFG = {
  inactive: { label: 'Ikke aktivert', bg: 'bg-amber-100', text: 'text-amber-700' },
  active:   { label: 'Aktiv',         bg: 'bg-green-100', text: 'text-green-700' },
  used:     { label: 'Brukt',         bg: 'bg-gray-100',  text: 'text-gray-500' },
  expired:  { label: 'Utgått',        bg: 'bg-red-100',   text: 'text-red-500' },
};

export default function TicketCard({ ticket }) {
  const [t, setT] = useState(ticket);
  const [open, setOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [, setTick] = useState(0);
  const qc = useQueryClient();

  const st = ticketState(t);

  // Live countdown while active.
  useEffect(() => {
    if (st !== 'active') return;
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [st]);

  const cfg = CFG[st] || { label: st, bg: 'bg-gray-100', text: 'text-gray-500' };
  const isPeriod = t.ticket_category === 'period';
  const canShow = st === 'active';
  const validUntil = t.valid_until ? new Date(t.valid_until) : null;

  const handleActivate = async () => {
    setActivating(true);
    try {
      const updated = await activateTicket(t);
      setT(updated);
      setOpen(true);
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className={`p-4 flex items-center justify-between ${canShow ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => canShow && setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{TYPE_EMOJI[t.type]}</span>
          <div>
            <p className="font-bold text-gray-900">{TYPE_LABEL[t.type]}</p>
            <p className="text-sm text-gray-500 capitalize">{t.ticket_category || 'single'} ticket</p>
            {validUntil && isPeriod && <p className="text-xs text-gray-400">Gyldig til {validUntil.toLocaleDateString('nb-NO')}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          {canShow && (open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
        </div>
      </div>

      {/* Single e-ticket not yet activated: must activate before it's valid */}
      {st === 'inactive' && (
        <div className="border-t border-gray-100 p-5 bg-amber-50 flex flex-col items-center gap-3">
          <p className="text-sm text-amber-700 text-center font-medium">
            Billetten er ikke aktivert ennå. Vis den til sjåføren for skanning, eller aktiver nå — gyldig i 5 min.
          </p>
          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> {activating ? 'Aktiverer…' : 'Aktiver billett'}
          </button>
        </div>
      )}

      {/* Active: show QR + countdown */}
      {canShow && open && (
        <div className="border-t border-gray-100 p-5 bg-gray-50 flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <QRCodeSVG value={t.qr_token} size={180} level="H" />
          </div>
          <p className="font-mono font-bold tracking-widest text-gray-800 text-xl mt-4">{t.short_code}</p>
          {!isPeriod ? (
            <div className="mt-2 flex items-center gap-1.5 bg-green-100 px-4 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-green-700" />
              <span className="font-bold text-green-700 text-lg tabular-nums">{formatRemaining(t)}</span>
              <span className="text-green-600 text-xs">gjenstår</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-2">Gyldig til {validUntil.toLocaleDateString('nb-NO')}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">Vis til inspektør · Trykk for å lukke</p>
        </div>
      )}
    </div>
  );
}