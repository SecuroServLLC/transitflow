import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QrCode, Users, Shield, CreditCard } from 'lucide-react';

export default function AdminDashboard() {
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.Ticket.list() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });

  const totalCredits = tickets.reduce((s, t) => s + (t.credits_paid || 0), 0);
  const usedTickets = tickets.filter(t => t.status === 'used').length;

  const stats = [
    { label: 'Total Tickets',      value: tickets.length,           icon: QrCode,     bg: 'bg-blue-50',   color: 'text-blue-600' },
    { label: 'Used Tickets',       value: usedTickets,              icon: QrCode,     bg: 'bg-green-50',  color: 'text-green-600' },
    { label: 'Customers',          value: customers.length,         icon: Users,      bg: 'bg-purple-50', color: 'text-purple-600' },
    { label: 'Inspectors',         value: inspectors.length,        icon: Shield,     bg: 'bg-orange-50', color: 'text-orange-600' },
    { label: 'Credits Collected',  value: totalCredits.toLocaleString(), icon: CreditCard, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-4">
            <div className={`${s.bg} rounded-lg p-3`}><s.icon className={`w-6 h-6 ${s.color}`} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-900 mb-3">Recent Tickets</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Code', 'Type', 'Credits', 'Method', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.slice(0, 10).map(t => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{t.short_code || t.qr_token?.substring(0, 8)}</code></td>
                <td className="px-4 py-3 capitalize">{t.type}</td>
                <td className="px-4 py-3">{t.credits_paid}</td>
                <td className="px-4 py-3 capitalize">{t.purchase_method}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.status === 'used' ? 'bg-green-100 text-green-700' :
                    t.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{t.purchased_at ? new Date(t.purchased_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No tickets yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}