import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Gift } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', email: '', phone: '', travel_credits: 0 };

export default function CustomersManager() {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [creditAmt, setCreditAmt] = useState(0);
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const create = useMutation({ mutationFn: d => base44.entities.Customer.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer added'); setModal(null); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Customer.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Updated'); setModal(null); } });
  const del = useMutation({ mutationFn: id => base44.entities.Customer.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Deleted'); } });

  const openCreate = () => { setSelected(null); setForm(EMPTY); setModal('form'); };
  const openEdit = c => { setSelected(c); setForm({ name: c.name, email: c.email||'', phone: c.phone||'', travel_credits: c.travel_credits||0 }); setModal('form'); };
  const openCredits = c => { setSelected(c); setCreditAmt(0); setModal('credits'); };

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const data = { ...form, travel_credits: Number(form.travel_credits)||0 };
    selected ? update.mutate({ id: selected.id, d: data }) : create.mutate(data);
  };

  const addCredits = () => {
    const cur = selected.travel_credits || 0;
    update.mutate({ id: selected.id, d: { travel_credits: cur + Number(creditAmt) } });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','Email','Phone','Travel Credits','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email||'-'}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone||'-'}</td>
                <td className="px-4 py-3"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">{c.travel_credits||0}</span></td>
                <td className="px-4 py-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openCredits(c)} title="Add Credits"><Gift className="w-4 h-4 text-amber-500" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete?')) del.mutate(c.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No customers yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={modal==='form'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
            <div><Label>Travel Credits</Label><Input type="number" value={form.travel_credits} onChange={e => setForm(f=>({...f,travel_credits:e.target.value}))} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal==='credits'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Travel Credits — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{selected?.travel_credits||0}</p>
              <p className="text-amber-600 text-sm">current balance</p>
            </div>
            <div><Label>Credits to Add</Label><Input type="number" min="0" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={addCredits} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">Add Credits</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}