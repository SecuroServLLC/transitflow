import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const STATUS_COLORS = { unused: 'bg-blue-100 text-blue-700', used: 'bg-gray-100 text-gray-500', expired: 'bg-red-100 text-red-600', active: 'bg-green-100 text-green-700' };

export default function TicketsOverview() {
  const [search, setSearch] = useState('');
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets-overview'],
    queryFn: () => base44.entities.Ticket.list('-purchased_at', 300)
  });

  const filtered = tickets.filter(t =>
    !search ||
    t.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
    t.short_code?.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_phone?.includes(search)
  );

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tickets</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-gray-100 px-3 py-1 rounded-full font-medium">{tickets.length} total</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 max-w-sm">
        <Search className="w-4 h-4 text-gray-400" />
        <Input placeholder="Search ID, code, customer…" value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Ticket ID','Short Code','Type','Category','Method','Customer','Status','Issued At'].map(h =>
              <th key={h} className="text-left px-3 py-3 text-gray-600 font-medium text-xs">{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(t => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-3 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{t.ticket_id || t.id?.slice(0,8).toUpperCase() || '—'}</code></td>
                <td className="px-3 py-3"><code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">{t.short_code || '—'}</code></td>
                <td className="px-3 py-3 capitalize text-gray-700">{t.type}</td>
                <td className="px-3 py-3 capitalize text-gray-500">{t.ticket_category}</td>
                <td className="px-3 py-3 capitalize text-gray-500">{t.purchase_method || '—'}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-gray-800">{t.customer_name || 'Walk-in'}</p>
                  {t.customer_phone && <p className="text-xs text-gray-400">{t.customer_phone}</p>}
                </td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-500'}`}>{t.status}</span>
                </td>
                <td className="px-3 py-3 text-gray-400 text-xs">{t.purchased_at ? new Date(t.purchased_at).toLocaleString('nb-NO') : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No tickets found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}