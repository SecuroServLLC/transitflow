import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRefunds() {
  const [search, setSearch] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const qc = useQueryClient();

  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => base44.entities.Transaction.list('-created_date', 100) });

  const refund = useMutation({
    mutationFn: async ({ txn, customer }) => {
      if (txn.refunded) throw new Error('Already refunded');
      const updated = await base44.entities.Customer.update(customer.id, { credits: (customer.credits||0) + txn.amount });
      await base44.entities.Transaction.update(txn.id, { refunded: true });
      await base44.entities.Transaction.create({
        customer_id: customer.id, customer_name: customer.name, type: 'refund',
        amount: txn.amount, description: `Refund for: ${txn.description}`, performed_by: 'admin'
      });
      return updated;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      if (foundCustomer && updated.id === foundCustomer.id) setFoundCustomer(updated);
      toast.success('Refund processed!');
    },
    onError: e => toast.error(e.message)
  });

  const findCustomer = async () => {
    if (!search.trim()) return;
    const byPhone = await base44.entities.Customer.filter({ phone: search.trim() });
    if (byPhone.length > 0) { setFoundCustomer(byPhone[0]); return; }
    const byEmail = await base44.entities.Customer.filter({ email: search.toLowerCase().trim() });
    if (byEmail.length > 0) { setFoundCustomer(byEmail[0]); return; }
    toast.error('Customer not found'); setFoundCustomer(null);
  };

  const customerTxns = foundCustomer
    ? transactions.filter(t => t.customer_id === foundCustomer.id)
    : transactions;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Refunds</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <Input placeholder="Search by phone or email…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&findCustomer()} className="max-w-xs" />
        <Button onClick={findCustomer} variant="outline"><Search className="w-4 h-4 mr-2" />Find</Button>
        {foundCustomer && <Button onClick={() => { setSearch(''); setFoundCustomer(null); }} variant="ghost" className="text-gray-500">Clear</Button>}
      </div>

      {foundCustomer && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex justify-between">
          <div><p className="font-bold">{foundCustomer.name}</p><p className="text-sm text-gray-500">{foundCustomer.phone} · {foundCustomer.email}</p></div>
          <div className="text-right"><p className="text-2xl font-black text-blue-700">{foundCustomer.credits||0}</p><p className="text-xs text-gray-400">credits</p></div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Customer','Type','Amount','Description','Date','Action'].map(h=><th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {customerTxns.slice(0,50).map(t => {
              const cust = foundCustomer?.id === t.customer_id ? foundCustomer : null;
              return (
                <tr key={t.id} className={`border-b border-gray-100 last:border-0 ${t.refunded ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{t.customer_name||'—'}</td>
                  <td className="px-4 py-3 capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      t.type==='topup' ? 'bg-green-100 text-green-700' :
                      t.type==='refund' ? 'bg-purple-100 text-purple-700' :
                      t.type==='purchase' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>{t.type}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{t.amount} cr</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.description}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_date).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {!t.refunded && t.type === 'purchase' && t.customer_id && (
                      <Button size="sm" variant="outline"
                        onClick={async () => {
                          const list = await base44.entities.Customer.filter({ id: t.customer_id });
                          if (list.length === 0) { toast.error('Customer not found'); return; }
                          refund.mutate({ txn: t, customer: list[0] });
                        }}
                        disabled={refund.isPending}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Refund
                      </Button>
                    )}
                    {t.refunded && <span className="text-xs text-gray-400">Refunded</span>}
                  </td>
                </tr>
              );
            })}
            {customerTxns.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}