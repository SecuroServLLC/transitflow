import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function TicketsOverview() {
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.Ticket.list('-purchased_at', 200) });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">All Tickets</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Code', 'Type', 'Credits', 'Method', 'Status', 'Purchased', 'Used'].map(h =>
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {tickets.map(t => (
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
                  <td className="px-4 py-3 text-gray-500">{t.purchased_at ? new Date(t.purchased_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.used_at ? new Date(t.used_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {tickets.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No tickets yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}