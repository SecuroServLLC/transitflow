import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, PlusCircle, MinusCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', email: '', phone: '', credits: 0 };

export default function CustomersManager() {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [creditMode, setCreditMode] = useState('add'); // 'add' | 'remove'
  const [creditAmt, setCreditAmt] = useState(100);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 200)
  });

  const create = useMutation({
    mutationFn: d => base44.entities.Customer.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer added'); setModal(null); }
  });
  const update = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Customer.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Updated'); setModal(null); }
  });
  const del = useMutation({
    mutationFn: id => base44.entities.Customer.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Deleted'); }
  });

  const openCreate = () => { setSelected(null); setForm(EMPTY); setModal('form'); };
  const openEdit = c => { setSelected(c); setForm({ name: c.name, email: c.email||'', phone: c.phone||'', credits: c.credits||0 }); setModal('form'); };
  const openCredits = c => { setSelected(c); setCreditAmt(100); setCreditMode('add'); setReason(''); setModal('credits'); };

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const data = { ...form, credits: Number(form.credits) || 0 };
    selected ? update.mutate({ id: selected.id, d: data }) : create.mutate(data);
  };

  const applyCredits = useMutation({
    mutationFn: async () => {
      const amt = Number(creditAmt);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      const current = selected.credits || 0;
      const newBalance = creditMode === 'add' ? current + amt : Math.max(0, current - amt);
      const updated = await base44.entities.Customer.update(selected.id, { credits: newBalance });
      await base44.entities.Transaction.create({
        customer_id: selected.id,
        customer_name: selected.name,
        type: creditMode === 'add' ? 'bonus' : 'refund',
        amount: creditMode === 'add' ? amt : -amt,
        description: reason || `Admin ${creditMode === 'add' ? 'added' : 'removed'} ${amt} credits`,
        performed_by: 'admin'
      });
      return updated;
    },
    onSuccess: updated => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setSelected(updated);
      toast.success(`Credits ${creditMode === 'add' ? 'added' : 'removed'}!`);
      setModal(null);
    },
    onError: e => toast.error(e.message)
  });

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </div>

      <div className="mb-4 flex items-center gap-2 max-w-xs">
        <Search className="w-4 h-4 text-gray-400" />
        <Input placeholder="Search name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} className="text-sm" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','Email','Phone','Credits','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email||'-'}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone||'-'}</td>
                <td className="px-4 py-3">
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">
                    {c.credits||0} cr
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openCredits(c)} title="Manage Credits">
                    <PlusCircle className="w-4 h-4 text-amber-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete customer and all their data?')) del.mutate(c.id); }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Customer Form Modal */}
      <Dialog open={modal==='form'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
            <div><Label>Starting Credits</Label><Input type="number" value={form.credits} onChange={e => setForm(f=>({...f,credits:e.target.value}))} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credits Modal */}
      <Dialog open={modal==='credits'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Credits — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-amber-700">{selected?.credits||0}</p>
              <p className="text-amber-600 text-sm">current balance</p>
            </div>

            {/* Add / Remove toggle */}
            <div className="flex gap-2">
              <button onClick={() => setCreditMode('add')}
                className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${creditMode==='add' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                <PlusCircle className="w-4 h-4" /> Add
              </button>
              <button onClick={() => setCreditMode('remove')}
                className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${creditMode==='remove' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
                <MinusCircle className="w-4 h-4" /> Remove
              </button>
            </div>

            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[50,100,200,500].map(v => (
                <button key={v} onClick={() => setCreditAmt(v)}
                  className={`py-2 border-2 rounded-lg text-sm font-bold transition-all ${creditAmt===v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{v}</button>
              ))}
            </div>

            <div><Label>Amount</Label><Input type="number" min="1" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} /></div>
            <div><Label>Reason (optional)</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Compensation, bonus..." /></div>

            {creditAmt > 0 && (
              <div className={`rounded-lg p-3 text-sm ${creditMode==='add' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                New balance: <span className="font-bold">{creditMode==='add' ? (selected?.credits||0) + Number(creditAmt) : Math.max(0,(selected?.credits||0) - Number(creditAmt))} credits</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => applyCredits.mutate()} disabled={applyCredits.isPending}
                className={`flex-1 text-white ${creditMode==='add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {creditMode==='add' ? '+ Add Credits' : '− Remove Credits'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}