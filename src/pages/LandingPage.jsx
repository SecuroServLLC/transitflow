import { Link } from 'react-router-dom';
import LSTLogo from '@/components/LSTLogo';
import { Bus, Shield, Store, Users, MapPin, QrCode, Smartphone, Globe, CreditCard, ChevronRight, Star, Zap, Clock, CheckCircle } from 'lucide-react';

const PORTALS = [
  { path: '/app', icon: Smartphone, label: 'Passenger App', desc: 'Buy tickets, top up credits, manage your account', color: 'from-red-900 to-red-700' },
  { path: '/web', icon: Globe, label: 'Web Portal', desc: 'Full-featured browser ticketing experience', color: 'from-slate-800 to-slate-700' },
  { path: '/pos', icon: CreditCard, label: 'POS — Cashier', desc: 'Cashier terminal for ticket sales and top-ups', color: 'from-slate-800 to-slate-700' },
  { path: '/tvm', icon: QrCode, label: 'TVM — Ticket Machine', desc: 'Self-service vending machine interface', color: 'from-slate-800 to-slate-700' },
  { path: '/inspect', icon: Shield, label: 'Inspector Portal', desc: 'Validate tickets, issue penalty fares', color: 'from-slate-800 to-slate-700' },
  { path: '/retail', icon: Store, label: 'Retail Partner', desc: 'Retailer POS — sell tickets at your store', color: 'from-slate-800 to-slate-700' },
  { path: '/partner', icon: Users, label: 'Partner Portal', desc: 'Business partner dashboard and reporting', color: 'from-slate-800 to-slate-700' },
  { path: '/driver', icon: Bus, label: 'Driver Portal', desc: 'Bus driver scan & operations terminal', color: 'from-slate-800 to-slate-700' },
  { path: '/admin', icon: Shield, label: 'Admin Office', desc: 'Full system administration and analytics', color: 'from-slate-800 to-slate-700' },
  { path: '/faq', icon: Star, label: 'Help & FAQ', desc: 'Support, guides and frequently asked questions', color: 'from-slate-800 to-slate-700' },
];

const STATS = [
  { value: '2.4M', label: 'Rides Per Year' },
  { value: '180+', label: 'Active Routes' },
  { value: '99.7%', label: 'System Uptime' },
  { value: '24/7', label: 'Service Hours' },
];

const FEATURES = [
  { icon: Zap, title: 'Instant Ticketing', desc: 'Buy and use tickets in under 10 seconds.' },
  { icon: Clock, title: 'Real-Time Tracking', desc: 'Live bus positions and departure boards.' },
  { icon: Shield, title: 'Verified Security', desc: 'QR validation with inspector override.' },
  { icon: MapPin, title: 'Full Route Coverage', desc: 'Every bus stop, every route, all day.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-[#c0392b]/30 bg-[#0a0a0a] sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LSTLogo size={44} />
            <div>
              <p className="font-black text-white tracking-wider text-sm leading-none">LOS SANTOS</p>
              <p className="font-black text-[#c0392b] tracking-widest text-xs leading-none">TRANSIT</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#portals" className="hover:text-white transition-colors">Portals</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <Link to="/roadmap" className="hover:text-white transition-colors">Roadmap</Link>
            <Link to="/faq" className="hover:text-white transition-colors">Help</Link>
          </div>
          <Link to="/app" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Get the App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c0392b]/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#c0392b]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="flex justify-center mb-8">
            <LSTLogo size={120} className="drop-shadow-2xl" />
          </div>
          <div className="inline-flex items-center gap-2 bg-[#c0392b]/20 border border-[#c0392b]/40 rounded-full px-4 py-1.5 text-xs text-[#e74c3c] font-semibold mb-6">
            <span className="w-2 h-2 bg-[#c0392b] rounded-full animate-pulse"></span>
            System Operational — All routes running
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-none tracking-tight">
            LOS SANTOS<br />
            <span className="text-[#c0392b]">TRANSIT</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The complete digital transit platform. Buy tickets, validate passes, manage operations — all in one unified system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/app" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/30">
              <Smartphone className="w-5 h-5" /> Passenger App
            </Link>
            <Link to="/faq" className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2">
              Learn More <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-800 py-12 bg-[#111]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-white">{s.value}</p>
              <p className="text-slate-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Why LST Digital?</h2>
          <p className="text-slate-400 text-center mb-12">Built for speed, reliability, and scale.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-[#111] border border-slate-800 hover:border-[#c0392b]/50 rounded-2xl p-6 transition-all group">
                <div className="w-12 h-12 bg-[#c0392b]/10 border border-[#c0392b]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#c0392b]/20 transition-all">
                  <f.icon className="w-6 h-6 text-[#c0392b]" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals Grid */}
      <section id="portals" className="py-20 px-6 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">System Portals</h2>
          <p className="text-slate-400 text-center mb-12">Every role. One platform.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PORTALS.map(p => (
              <Link key={p.path} to={p.path}
                className={`bg-gradient-to-br ${p.color} border border-slate-700 hover:border-[#c0392b]/60 rounded-2xl p-5 group transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-red-900/20`}>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#c0392b]/30 transition-all">
                  <p.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{p.label}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{p.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-[#c0392b] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Access Portal <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Install PWA Banner */}
      <section className="py-16 px-6 bg-gradient-to-r from-[#c0392b]/20 via-[#c0392b]/10 to-transparent border-t border-[#c0392b]/20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <LSTLogo size={80} />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-black mb-2">Install as App</h2>
            <p className="text-slate-400 text-sm">Tap "Add to Home Screen" in your browser to install Los Santos Transit as a native app on iOS or Android. No app store required.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link to="/app" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors text-center">Open Passenger App</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <LSTLogo size={32} />
            <div>
              <p className="font-black text-white text-xs tracking-wider">LOS SANTOS TRANSIT</p>
              <p className="text-slate-600 text-xs">© 2026 All rights reserved</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            {PORTALS.map(p => <Link key={p.path} to={p.path} className="hover:text-white transition-colors">{p.label}</Link>)}
          </div>
        </div>
      </footer>
    </div>
  );
}