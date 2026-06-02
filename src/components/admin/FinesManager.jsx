import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLE = { unpaid: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700', disputed: 'bg-yellow-100 text-yellow-700' };

export default function FinesManager() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: fines = [], isLoading } = useQuery({
    queryKey: ['all-fines'],
    queryFn: () => base44.entities.Fine.list('-created_date', 200)
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Fine.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-fines'] }); toast.success('Status updated'); }
  });

  const filtered = fines.filter(f => !search || [f.name, f.phone, f.ssn, f.tripID, f.busline].some(v => v?.toLowerCase().includes(search.toLowerCase())));

  const total = fines.length;
  const unpaid = fines.filter(f => f.status === 'unpaid').length;
  const totalKr = fines.filter(f => f.status === 'paid').reduce((s, f) => s + (f.amount_kr || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-500" /> Penalty Fares</h2>
          <p className="text-gray-500 text-sm">Digitally issued fines from inspectors</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Total Issued', total], ['Outstanding', unpaid], [`Revenue Collected`, `${totalKr} kr`]].map(([k, v]) => (
          <div key={k} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{v}</p>
            <p className="text-xs text-gray-500 mt-1">{k}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 max-w-xs">
        <Search className="w-4 h-4 text-gray-400" />
        <Input placeholder="Search name, phone, trip ID..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Passenger', 'Phone', 'Route / Trip ID', 'Reason', 'Amount', 'Inspector', 'Date', 'Status'].map(h => <th key={h} className="text-left px-3 py-3 text-gray-500 font-medium text-xs">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> :
              filtered.map(f => (
                <tr key={f.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium">{f.name}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{f.phone}</td>
                  <td className="px-3 py-3 text-xs">
                    <p className="font-medium">{f.busline || '—'}</p>
                    <p className="text-gray-400 font-mono">{f.tripID}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{f.reason}</td>
                  <td className="px-3 py-3 font-bold text-red-600">{f.amount_kr} kr</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{f.issued_by}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{f.issued_at ? new Date(f.issued_at).toLocaleDateString('nb-NO') : '—'}</td>
                  <td className="px-3 py-3">
                    <select value={f.status} onChange={e => updateStatus.mutate({ id: f.id, status: e.target.value })}
                      className={`text-xs px-2 py-1 rounded-full font-bold border-0 capitalize cursor-pointer ${STATUS_STYLE[f.status] || 'bg-gray-100'}`}>
                      <option value="unpaid">unpaid</option>
                      <option value="paid">paid</option>
                      <option value="disputed">disputed</option>
                    </select>
                  </td>
                </tr>
              ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No fines found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}