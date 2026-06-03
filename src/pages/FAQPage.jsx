import { useState } from 'react';
import { Link } from 'react-router-dom';
import LSTLogo from '@/components/LSTLogo';
import { ChevronDown, ChevronUp, Search, Bus, CreditCard, Shield, Smartphone, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
  {
    icon: Smartphone,
    label: 'Ticketing',
    faqs: [
      { q: 'How do I buy a ticket?', a: 'Open the Passenger App at /app, log in, choose your ticket type, and confirm the purchase. Credits are deducted instantly.' },
      { q: 'What is the difference between Single and Period tickets?', a: 'Single tickets are one-ride passes valid until scanned. Period (30-Day) passes are unlimited rides for 30 calendar days from purchase.' },
      { q: 'Can I buy tickets for family members?', a: 'Yes! In your profile under Connected Users, add family members. When buying, select the family member as the recipient.' },
      { q: "My QR code won't scan. What do I do?", a: 'Show the inspector your 8-character Short Code. They can enter it manually or use the Force Manual Override feature on their terminal.' },
    ]
  },
  {
    icon: CreditCard,
    label: 'Credits & Payments',
    faqs: [
      { q: 'How do credits work?', a: 'Credits are the platform currency. 100 credits ≈ 100 kr of transit value. Purchase credit bundles to top up your balance at any cashier, TVM, or online.' },
      { q: 'Do I get bonus credits on top-ups?', a: 'Yes! Standard top-ups include a 40% bonus. 1000 kr top-up gives you 1400 credits automatically.' },
      { q: 'How does the Loyalty Ladder work?', a: 'Your first 5 ticket purchases get a 5% discount. Each additional purchase adds 2% more. Once your monthly spending reaches 1.2× the period pass price, remaining rides are free.' },
      { q: 'Can I get a refund?', a: 'Unused single tickets can be refunded via the Admin panel or Cashier. Period passes cannot be refunded once activated.' },
    ]
  },
  {
    icon: Shield,
    label: 'Inspectors & Fines',
    faqs: [
      { q: 'What happens if I travel without a ticket?', a: 'Inspectors can issue a digital penalty fare of 1,150 kr. This will appear in your account and can be paid with credits or reported to authorities.' },
      { q: 'How do I pay a fine?', a: 'Open your Passenger App profile. Any outstanding penalty fares appear as red alerts at the top. Tap "Clear with Credits" to pay instantly.' },
      { q: 'Can I dispute a fine?', a: 'Disputed fines are escalated to the Admin office. Contact support with your Trip ID, and an administrator will review the case.' },
    ]
  },
  {
    icon: Bus,
    label: 'Routes & Stops',
    faqs: [
      { q: 'Where can I see live bus positions?', a: 'Open the Passenger App, go to the Buy tab and scroll down to Live Bus Stops. The app uses your GPS and the Entur Norway API to show real-time departures.' },
      { q: 'What is Auto-Boarding?', a: 'Auto-Boarding is an experimental feature that uses your device GPS. When a bus is within 100 metres, it auto-purchases a single ticket from your credit balance.' },
      { q: 'Does LST cover regional routes?', a: 'LST covers all urban routes within the city. Regional and intercity routes are operated by partner agencies.' },
    ]
  },
  {
    icon: Star,
    label: 'Retailers & Partners',
    faqs: [
      { q: 'How do I become a ticket retailer?', a: 'Contact our partnership team or visit the Partner Portal at /partner. Retailers purchase tickets at a discounted settlement price based on their commission rate.' },
      { q: 'What is the commission rate for retailers?', a: 'Default commission is 5%. This means a 100 kr face-value ticket costs the retailer 95 kr. Higher-volume retailers can negotiate better rates.' },
      { q: 'How does group ticketing work?', a: 'Create a Group Ride pool in the app. Share the code with 10+ people. Once 10 members pay in, everyone gets a 10% discounted single ticket released simultaneously.' },
    ]
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState({});
  const [search, setSearch] = useState('');

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = CATEGORIES.map(c => ({
    ...c,
    faqs: c.faqs.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
  })).filter(c => c.faqs.length > 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#c0392b]/30 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <LSTLogo size={36} />
            <div>
              <p className="font-black text-white text-xs tracking-wider leading-none">LOS SANTOS</p>
              <p className="font-black text-[#c0392b] text-xs tracking-widest leading-none">TRANSIT</p>
            </div>
          </Link>
          <Link to="/app" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
            Open App
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-3">Help & <span className="text-[#c0392b]">FAQ</span></h1>
          <p className="text-slate-400">Find answers to the most common questions about Los Santos Transit.</p>
        </div>

        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[#111] border-slate-700 text-white placeholder:text-slate-600 h-12"
          />
        </div>

        <div className="space-y-8">
          {filtered.map(cat => (
            <div key={cat.label}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#c0392b]/20 rounded-lg flex items-center justify-center">
                  <cat.icon className="w-4 h-4 text-[#c0392b]" />
                </div>
                <h2 className="text-xl font-bold">{cat.label}</h2>
              </div>
              <div className="space-y-2">
                {cat.faqs.map((f, i) => {
                  const key = `${cat.label}-${i}`;
                  return (
                    <div key={key} className="bg-[#111] border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all">
                      <button className="w-full flex justify-between items-center px-5 py-4 text-left gap-4" onClick={() => toggle(key)}>
                        <span className="font-semibold text-sm text-slate-100">{f.q}</span>
                        {open[key] ? <ChevronUp className="w-4 h-4 text-[#c0392b] shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                      </button>
                      {open[key] && (
                        <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800">
                          <div className="pt-3">{f.a}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#111] border border-[#c0392b]/20 rounded-2xl p-8 text-center">
          <h3 className="font-bold text-xl mb-2">Still need help?</h3>
          <p className="text-slate-400 text-sm mb-4">Contact our 24/7 support team or visit the Admin Office.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/admin" className="border border-slate-700 hover:border-slate-500 text-slate-300 px-6 py-3 rounded-xl text-sm font-bold transition-colors">Admin Office</Link>
            <a href="mailto:support@lst.transit" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors">Email Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}