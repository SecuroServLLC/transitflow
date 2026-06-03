import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QrCode, Users, Shield, CreditCard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { subDays, format, startOfDay, isAfter, isBefore, addDays } from 'date-fns';

function buildSalesData(tickets) {
  // Build daily counts for last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const label = format(d, 'MMM d');
    const start = startOfDay(d);
    const end = startOfDay(subDays(new Date(), i - 1));
    const count = tickets.filter(t => {
      const ts = t.purchased_at ? new Date(t.purchased_at) : null;
      return ts && isAfter(ts, start) && isBefore(ts, end);
    }).length;
    days.push({ label, date: d, count, isFuture: false });
  }

  // Simple linear trend: average of last 7 days to project next 7
  const last7 = days.slice(-7).map(d => d.count);
  const avg = last7.reduce((a, b) => a + b, 0) / last7.length;
  const trend7 = days.slice(-7);
  let slope = 0;
  if (trend7.length >= 2) {
    slope = (trend7[trend7.length - 1].count - trend7[0].count) / trend7.length;
  }

  // Add 7 forecast days
  for (let i = 1; i <= 7; i++) {
    const projected = Math.max(0, Math.round(avg + slope * i));
    days.push({
      label: format(addDays(new Date(), i), 'MMM d'),
      count: null,
      projected,
      isFuture: true,
    });
  }

  return days;
}

function buildPeriodSummary(tickets, days) {
  const cutoff = startOfDay(subDays(new Date(), days));
  const subset = tickets.filter(t => t.purchased_at && isAfter(new Date(t.purchased_at), cutoff));
  const prev = tickets.filter(t => {
    if (!t.purchased_at) return false;
    const ts = new Date(t.purchased_at);
    return isAfter(ts, startOfDay(subDays(new Date(), days * 2))) && isBefore(ts, cutoff);
  });
  const change = prev.length > 0 ? Math.round(((subset.length - prev.length) / prev.length) * 100) : null;
  return { count: subset.length, change };
}

export default function AdminDashboard() {
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.Ticket.list('-purchased_at', 2000) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });

  const totalCredits = tickets.reduce((s, t) => s + (t.credits_paid || 0), 0);
  const usedTickets = tickets.filter(t => t.status === 'used').length;

  const stats = [
    { label: 'Total Tickets', value: tickets.length, icon: QrCode, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Used Tickets', value: usedTickets, icon: QrCode, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Customers', value: customers.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Inspectors', value: inspectors.length, icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Credits Collected', value: totalCredits.toLocaleString(), icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const chartData = buildSalesData(tickets);
  const daily = buildPeriodSummary(tickets, 1);
  const weekly = buildPeriodSummary(tickets, 7);
  const monthly = buildPeriodSummary(tickets, 30);

  const periods = [
    { label: 'Today', ...daily },
    { label: 'This Week', ...weekly },
    { label: 'This Month', ...monthly },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-200 flex items-center gap-4">
            <div className={`${s.bg} rounded-lg p-3`}><s.icon className={`w-6 h-6 ${s.color}`} /></div>
            <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-gray-500 text-sm">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {periods.map(p => (
          <div key={p.label} className="bg-white rounded-xl p-5 border border-gray-200">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{p.label}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{p.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">tickets sold</p>
            {p.change !== null && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${p.change > 0 ? 'text-green-600' : p.change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {p.change > 0 ? <TrendingUp className="w-3 h-3" /> : p.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {p.change > 0 ? '+' : ''}{p.change}% vs previous period
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sales trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Sales Trend</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 30 days + 7-day forecast (dashed)</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-blue-500 inline-block rounded"></span> Actual</span>
            <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-orange-400 inline-block rounded border-dashed border border-orange-400"></span> Forecast</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(val, name) => [val ?? '—', name === 'count' ? 'Actual' : 'Forecast']}
            />
            <ReferenceLine x={format(new Date(), 'MMM d')} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Today', position: 'insideTop', fontSize: 10, fill: '#ef4444' }} />
            <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" dot={false} connectNulls={false} />
            <Area type="monotone" dataKey="projected" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fill="url(#orangeGrad)" dot={false} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent tickets */}
      <h3 className="font-bold text-gray-900 mb-3">Recent Tickets</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.short_code}</td>
                <td className="px-4 py-3 capitalize">{t.type}</td>
                <td className="px-4 py-3">{t.credits_paid}</td>
                <td className="px-4 py-3 capitalize">{t.purchase_method}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.status === 'used' ? 'bg-green-100 text-green-700' :
                    t.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{t.purchased_at ? new Date(t.purchased_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No tickets yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}