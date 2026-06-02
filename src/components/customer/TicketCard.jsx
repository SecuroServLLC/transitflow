import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_EMOJI = { adult:'🧑', child:'👶', senior:'👴', student:'🎓', military:'🪖' };
const TYPE_LABEL = { adult:'Adult', child:'Child', senior:'Senior', student:'Student', military:'Military' };

export default function TicketCard({ ticket }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const validUntil = ticket.valid_until ? new Date(ticket.valid_until) : null;
  const isPeriod = ticket.ticket_category === 'period';
  const isExpired = isPeriod && validUntil && validUntil < now;

  let status = ticket.status;
  if (isPeriod) status = isExpired ? 'expired' : 'active';

  const cfg = {
    unused:  { label: 'Valid',   bg: 'bg-blue-100',  text: 'text-blue-700' },
    active:  { label: 'Active',  bg: 'bg-green-100', text: 'text-green-700' },
    used:    { label: 'Used',    bg: 'bg-gray-100',  text: 'text-gray-500' },
    expired: { label: 'Expired', bg: 'bg-red-100',   text: 'text-red-500' },
  }[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-500' };

  const canShow = status === 'unused' || status === 'active';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className={`p-4 flex items-center justify-between ${canShow ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => canShow && setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{TYPE_EMOJI[ticket.type]}</span>
          <div>
            <p className="font-bold text-gray-900">{TYPE_LABEL[ticket.type]}</p>
            <p className="text-sm text-gray-500 capitalize">{ticket.ticket_category || 'single'} ticket</p>
            {validUntil && <p className="text-xs text-gray-400">Until {validUntil.toLocaleDateString()}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          {canShow && (open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
        </div>
      </div>

      {canShow && open && (
        <div className="border-t border-gray-100 p-5 bg-gray-50 flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <QRCodeSVG value={ticket.qr_token} size={180} level="H" />
          </div>
          <p className="font-mono font-bold tracking-widest text-gray-800 text-xl mt-4">{ticket.short_code}</p>
          <p className="text-xs text-gray-400">Show to inspector · Tap to collapse</p>
        </div>
      )}
    </div>
  );
}