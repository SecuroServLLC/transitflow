import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LSTLogo from '@/components/LSTLogo';
import { toast } from 'sonner';
import { Handshake, CheckCircle2, Globe, Bus, Store, Building2, ChevronRight } from 'lucide-react';

const SERVICES = [
  { icon: Bus, title: 'Transit Integration', desc: 'Embed LST ticketing directly into your platform or physical location.' },
  { icon: Store, title: 'Retail Distribution', desc: 'Sell LST tickets at your store and earn commission on every sale.' },
  { icon: Globe, title: 'Corporate Travel', desc: 'Bulk ticket packages and invoiced accounts for your workforce.' },
  { icon: Building2, title: 'Government & Institutions', desc: 'Custom agreements for schools, hospitals, and public entities.' },
];

const BENEFITS = [
  'Dedicated account manager',
  'Custom commission structures',
  'White-label portal options',
  'Priority API access',
  'Monthly settlement statements',
  'Co-marketing opportunities',
];

export default function PartnerPortal() {
  const [form, setForm] = useState({ name: '', type: 'retail', contact_name: '', email: '', phone: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: partners = [] } = useQuery({
    queryKey: ['active-partners'],
    queryFn: () => base44.entities.Partner.filter({ is_active: true }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.contact_name) { toast.error('Please fill in all required fields'); return; }
    setSubmitting(true);
    await base44.entities.Partner.create({ ...form, is_active: false, revenue_share: 0, discount_rate: 0 });
    setSubmitted(true);
    setSubmitting(false);
    toast.success('Application submitted! We\'ll be in touch within 48 hours.');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-[#c0392b]/30 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <LSTLogo size={36} />
            <div>
              <p className="font-black text-white text-xs tracking-wider leading-none">LOS SANTOS</p>
              <p className="font-black text-[#c0392b] text-xs tracking-widest leading-none">TRANSIT · PARTNERS</p>
            </div>
          </Link>
          <Link to="/app" className="bg-[#c0392b] hover:bg-[#a93226] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
            Passenger App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6 text-center border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-[#c0392b]/20 border border-[#c0392b]/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Handshake className="w-8 h-8 text-[#c0392b]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Become a <span className="text-[#c0392b]">Partner</span></h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Join the Los Santos Transit partner network. Distribute tickets, earn commission, and help more people move around the city.</p>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-10">Partnership Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.map(s => (
              <div key={s.title} className="bg-[#111] border border-slate-800 hover:border-[#c0392b]/40 rounded-2xl p-5 transition-all group">
                <div className="w-10 h-10 bg-[#c0392b]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#c0392b]/20 transition-all">
                  <s.icon className="w-5 h-5 text-[#c0392b]" />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{s.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits + Active Partners */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-black mb-6">What You Get</h2>
            <div className="space-y-3">
              {BENEFITS.map(b => (
                <div key={b} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#c0392b] shrink-0" />
                  <span className="text-slate-300 text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active partners */}
          <div>
            <h2 className="text-2xl font-black mb-6">Active Partners</h2>
            {partners.length === 0 ? (
              <div className="bg-[#111] border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
                Be the first partner in the network.
              </div>
            ) : (
              <div className="space-y-3">
                {partners.slice(0, 6).map(p => (
                  <div key={p.id} className="bg-[#111] border border-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm text-white">{p.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{p.type}</p>
                    </div>
                    {p.revenue_share > 0 && <span className="text-xs text-[#c0392b] font-bold">{p.revenue_share}% rev share</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 px-6 bg-[#0d0d0d] border-t border-slate-800">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">Apply to Partner</h2>
          <p className="text-slate-400 text-sm text-center mb-8">Fill in the form and our team will review your application within 48 hours.</p>

          {submitted ? (
            <div className="bg-green-950/30 border border-green-700 rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
              <h3 className="text-xl font-black text-green-400">Application Submitted!</h3>
              <p className="text-slate-400 text-sm">We'll review your application and contact you within 48 hours.</p>
              <Link to="/" className="inline-flex items-center gap-1 text-[#c0392b] text-sm font-semibold hover:underline">
                Back to Home <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#111] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-400">Business / Organisation Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" required />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Contact Person *</Label>
                  <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" required />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Partner Type</Label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full mt-1 bg-[#0a0a0a] border border-slate-700 text-white rounded-md px-3 py-2 text-sm">
                    <option value="retail">Retail</option>
                    <option value="transport">Transport</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="government">Government</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" required />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-[#0a0a0a] border-slate-700 text-white mt-1" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-400">Notes / How can we help?</Label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full mt-1 bg-[#0a0a0a] border border-slate-700 text-white rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[#c0392b]" />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-12 bg-[#c0392b] hover:bg-[#a93226] font-bold">
                {submitting ? 'Submitting...' : 'Submit Application →'}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-600">
        <p>Los Santos Transit Partner Portal · <Link to="/faq" className="hover:text-white transition-colors">Help & FAQ</Link> · <Link to="/" className="hover:text-white transition-colors">Home</Link></p>
      </footer>
    </div>
  );
}