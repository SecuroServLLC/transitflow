import { Link } from 'react-router-dom';
import LSTLogo from '@/components/LSTLogo';
import { CheckCircle2, Circle, Clock, Zap } from 'lucide-react';

const PHASES = [
  {
    phase: 'Phase 1', label: 'Core Platform', status: 'done', color: 'border-green-500',
    items: [
      { done: true, text: 'Passenger App (buy, manage, QR tickets)' },
      { done: true, text: 'Credit system with 40% top-up bonus' },
      { done: true, text: 'Inspector portal with scan dashboard' },
      { done: true, text: 'Admin portal with full entity management' },
      { done: true, text: 'POS cashier terminal with fee engine' },
      { done: true, text: 'TVM ticket vending machine' },
      { done: true, text: 'PDF ticket printing' },
      { done: true, text: 'Transaction audit log' },
    ]
  },
  {
    phase: 'Phase 2', label: 'Ecosystem Expansion', status: 'done', color: 'border-green-500',
    items: [
      { done: true, text: 'Retailer portal with commission calculations' },
      { done: true, text: 'Partner portal & application form' },
      { done: true, text: 'Bus driver validation terminal' },
      { done: true, text: 'Digital penalty fares with full offender form' },
      { done: true, text: 'Loyalty ladder discount program' },
      { done: true, text: 'Group ride pooling (10+ people = 10% off)' },
      { done: true, text: 'Connected family accounts' },
      { done: true, text: 'Live bus stops via Entur Norway API' },
      { done: true, text: 'Auto-boarding GPS demo' },
      { done: true, text: 'LST brand + landing page + PWA installable' },
    ]
  },
  {
    phase: 'Phase 3', label: 'Smart Features', status: 'upcoming', color: 'border-blue-500',
    items: [
      { done: false, text: 'Real QR code scanner (camera-based)' },
      { done: false, text: 'Push notifications for departures & expiry' },
      { done: false, text: 'Subscription auto-renew with saved cards' },
      { done: false, text: 'Stripe payment integration for real money' },
      { done: false, text: 'Apple/Google Wallet ticket export' },
      { done: false, text: 'Budget tracker for commute spending' },
      { done: false, text: 'Monthly commuter reports (PDF export)' },
      { done: false, text: 'Multi-language support (NO, EN, PL, UR)' },
    ]
  },
  {
    phase: 'Phase 4', label: 'Analytics & Scale', status: 'planned', color: 'border-slate-600',
    items: [
      { done: false, text: 'Live analytics dashboard for admin' },
      { done: false, text: 'Route performance heatmaps' },
      { done: false, text: 'Revenue forecasting AI model' },
      { done: false, text: 'Inspector performance scoring' },
      { done: false, text: 'Retailer settlement automation' },
      { done: false, text: 'API key system for third-party integration' },
      { done: false, text: 'White-label portal deployment' },
      { done: false, text: 'Corporate travel accounts / B2B billing' },
    ]
  },
];

const STATUS_BADGE = {
  done: { label: 'Completed', icon: CheckCircle2, class: 'bg-green-900/40 text-green-400 border-green-700' },
  upcoming: { label: 'In Progress', icon: Zap, class: 'bg-blue-900/40 text-blue-400 border-blue-700' },
  planned: { label: 'Planned', icon: Clock, class: 'bg-slate-800 text-slate-400 border-slate-700' },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#c0392b]/30 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <LSTLogo size={36} />
            <div><p className="font-black text-white text-xs tracking-wider leading-none">LOS SANTOS</p><p className="font-black text-[#c0392b] text-xs tracking-widest leading-none">TRANSIT</p></div>
          </Link>
          <Link to="/app" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Open App</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-3">Product <span className="text-[#c0392b]">Roadmap</span></h1>
          <p className="text-slate-400">Our platform development journey — past, present, and future.</p>
        </div>

        <div className="space-y-8">
          {PHASES.map(phase => {
            const badge = STATUS_BADGE[phase.status];
            const BadgeIcon = badge.icon;
            const done = phase.items.filter(i => i.done).length;
            return (
              <div key={phase.phase} className={`bg-[#111] border-l-4 ${phase.color} rounded-2xl p-6 space-y-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">{phase.phase}</p>
                    <h2 className="text-xl font-black text-white mt-0.5">{phase.label}</h2>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-semibold ${badge.class}`}>
                    <BadgeIcon className="w-3.5 h-3.5" />{badge.label}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{done} / {phase.items.length} features</span>
                    <span>{Math.round(done / phase.items.length * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${phase.status === 'done' ? 'bg-green-500' : phase.status === 'upcoming' ? 'bg-blue-500' : 'bg-slate-600'}`} style={{ width: `${(done / phase.items.length) * 100}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {phase.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      {item.done ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />}
                      <span className={item.done ? 'text-slate-300' : 'text-slate-600'}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border border-[#c0392b]/20 bg-[#c0392b]/5 rounded-2xl p-6 text-center">
          <p className="text-slate-300 text-sm">Have a feature request or want to prioritize something?</p>
          <Link to="/partner" className="inline-block mt-3 bg-[#c0392b] hover:bg-[#a93226] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">Contact Partnership Team</Link>
        </div>
      </div>
    </div>
  );
}