import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LSTLogo from '@/components/LSTLogo';
import { AlertTriangle, Clock, XCircle, Info, ChevronRight, CheckCircle } from 'lucide-react';

const TYPE_CONFIG = {
  delay: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-700/40', badge: 'bg-amber-800/60 text-amber-300', label: 'Delay' },
  disruption: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-700/40', badge: 'bg-orange-800/60 text-orange-300', label: 'Disruption' },
  cancellation: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-700/40', badge: 'bg-red-800/60 text-red-300', label: 'Cancellation' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-700/40', badge: 'bg-blue-800/60 text-blue-300', label: 'Information' },
};

const SEV_CONFIG = {
  low: 'bg-slate-700 text-slate-300',
  medium: 'bg-amber-800/60 text-amber-300',
  high: 'bg-orange-800/60 text-orange-300',
  critical: 'bg-red-800/60 text-red-300',
};

export default function ServiceMessages() {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['service-messages'],
    queryFn: () => base44.entities.ServiceMessage.filter({ is_active: true }, '-published_at', 50),
  });

  const critical = messages.filter(m => m.severity === 'critical' || m.type === 'cancellation');
  const others = messages.filter(m => m.severity !== 'critical' && m.type !== 'cancellation');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-[#c0392b]/30 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <LSTLogo size={36} />
            <div>
              <p className="font-black text-white text-xs tracking-wider leading-none">LOS SANTOS TRANSIT</p>
              <p className="font-black text-[#c0392b] text-[10px] tracking-widest leading-none">SERVICE MESSAGES</p>
            </div>
          </Link>
          <Link to="/" className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors">
            Home <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Service Messages</h1>
          <p className="text-slate-400">Live updates on delays, disruptions and cancellations across all LST routes.</p>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-slate-500">Loading messages...</div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="bg-green-950/20 border border-green-800/30 rounded-2xl p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-400">All Systems Normal</h2>
            <p className="text-slate-400 text-sm mt-2">No active service disruptions. All routes operating normally.</p>
          </div>
        )}

        {critical.length > 0 && (
          <div className="mb-8 space-y-3">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">⚠ Critical Alerts</p>
            {critical.map(m => <MessageCard key={m.id} message={m} />)}
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-3">
            {critical.length > 0 && <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Other Notices</p>}
            {others.map(m => <MessageCard key={m.id} message={m} />)}
          </div>
        )}
      </div>

      <footer className="border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-600 mt-10">
        <p>Los Santos Transit · <Link to="/" className="hover:text-white">Home</Link> · <Link to="/faq" className="hover:text-white">Help & FAQ</Link></p>
      </footer>
    </div>
  );
}

function MessageCard({ message: m }) {
  const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  const routes = m.routes ? m.routes.split(',').map(r => r.trim()).filter(Boolean) : [];

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${cfg.badge}`}>{cfg.label}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${SEV_CONFIG[m.severity] || SEV_CONFIG.medium}`}>{m.severity}</span>
            {routes.map(r => (
              <span key={r} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">{r}</span>
            ))}
          </div>
          <h3 className="font-bold text-white">{m.title}</h3>
          <p className="text-slate-300 text-sm mt-1 leading-relaxed">{m.message}</p>
          {m.expected_resolution && (
            <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Expected resolution: {m.expected_resolution}
            </p>
          )}
          {m.published_at && (
            <p className="text-slate-600 text-xs mt-1">
              Published {new Date(m.published_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}