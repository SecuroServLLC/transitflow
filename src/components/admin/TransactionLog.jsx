import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpRight, ArrowDownLeft, Shield } from 'lucide-react';

const TYPE_STYLE = {
  topup: 'bg-green-100 text-green-700',
  purchase: 'bg-blue-100 text-blue-700',
  refund: 'bg-orange-100 text-orange-700',
  bonus: 'bg-purple-100 text-purple-700'
};

export default function TransactionLog() {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 500)
  });

  const filtered = txs.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType;
    const matchSearch = !search || [t.customer_name, t.description, t.ticket_id, t.performed_by].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const totalTopup = txs.filter(t => t.type === 'topup').reduce((s, t) => s + (t.amount || 0), 0);
  const totalPurchase = txs.filter(t => t.type === 'purchase').reduce((s, t) => s + (t.amount || 0), 0);
  const totalRefund = txs.filter(t => t.type === 'refund').reduce((s, t) => s + Math.abs(t.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction Audit Log</h2>
          <p className="text-gray-500 text-sm">Complete ledger of all credit movements in the system</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[['Credits Topped Up', totalTopup, 'text-green-600'], ['Credits Spent', totalPurchase, 'text-blue-600'], ['Credits Refunded', totalRefund, 'text-orange-600']].map(([k, v, c]) => (
          <div key={k} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-black ${c}`}>{v}</p>
            <p className="text-xs text-gray-500 mt-1">{k}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search customer, ticket, admin..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'topup', 'purchase', 'refund', 'bonus'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Date', 'Customer', 'Type', 'Credits', 'kr', 'Description', 'Performed By'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No transactions found</td></tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{new Date(t.created_date).toLocaleString('nb-NO')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{t.customer_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${TYPE_STYLE[t.type] || 'bg-gray-100 text-gray-500'}`}>
                      {(t.type === 'topup') && <ArrowUpRight className="w-3 h-3" />}
                      {(t.type === 'purchase') && <ArrowDownLeft className="w-3 h-3" />}
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-bold text-sm ${t.type === 'topup' || t.type === 'refund' ? 'text-green-600' : 'text-gray-800'}`}>
                    {t.type === 'topup' || t.type === 'refund' ? '+' : '-'}{Math.abs(t.amount || 0)} cr
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{t.kr_amount ? `${t.kr_amount} kr` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{t.description}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-600">
                    {t.performed_by === 'admin' ? <span className="flex items-center gap-1 text-blue-600"><Shield className="w-3 h-3" />Admin</span> : t.performed_by || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}