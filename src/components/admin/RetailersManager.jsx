import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Store, Package } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', contact_name: '', email: '', phone: '', address: '', commission_rate: 5, is_active: true, notes: '' };

export default function RetailersManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const { data: retailers = [] } = useQuery({ queryKey: ['retailers'], queryFn: () => base44.entities.Retailer.list() });
  const create = useMutation({ mutationFn: d => base44.entities.Retailer.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['retailers'] }); toast.success('Retailer added'); setModal(false); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Retailer.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['retailers'] }); toast.success('Updated'); setModal(false); } });
  const del = useMutation({ mutationFn: id => base44.entities.Retailer.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['retailers'] }); toast.success('Deleted'); } });
  const toggleActive = useMutation({ mutationFn: ({ id, val }) => base44.entities.Retailer.update(id, { is_active: val }), onSuccess: () => qc.invalidateQueries({ queryKey: ['retailers'] }) });

  const openCreate = () => { setSelected(null); setForm(EMPTY); setModal(true); };
  const openEdit = r => { setSelected(r); setForm({ name: r.name, contact_name: r.contact_name||'', email: r.email||'', phone: r.phone||'', address: r.address||'', commission_rate: r.commission_rate||5, is_active: r.is_active!==false, notes: r.notes||'' }); setModal(true); };

  const save = () => {
    if (!form.name.trim()) { toast.error('Business name required'); return; }
    const d = { ...form, commission_rate: Number(form.commission_rate) || 5 };
    selected ? update.mutate({ id: selected.id, d }) : create.mutate(d);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retailers</h2>
          <p className="text-gray-500 text-sm mt-1">Shops and kiosks authorised to sell transit tickets</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Retailer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {retailers.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{r.name}</p>
                  {r.contact_name && <p className="text-sm text-gray-500">{r.contact_name}</p>}
                </div>
              </div>
              <button onClick={() => toggleActive.mutate({ id: r.id, val: !r.is_active })}
                className={`text-xs px-2 py-1 rounded-full font-bold ${r.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {r.is_active !== false ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              {r.email && <p>✉ {r.email}</p>}
              {r.phone && <p>📞 {r.phone}</p>}
              {r.address && <p>📍 {r.address}</p>}
            </div>
            <div className="flex items-center justify-between pt-1">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">90% innkjøpspris</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete retailer?')) del.mutate(r.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          </div>
        ))}
        {retailers.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No retailers yet. Add one to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={modal} onOpenChange={() => { setModal(false); setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Retailer' : 'Add Retailer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Business Name *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_name} onChange={e => setForm(f=>({...f,contact_name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
            <div><Label>Commission Rate (%)</Label><Input type="number" min="0" max="100" value={form.commission_rate} onChange={e => setForm(f=>({...f,commission_rate:e.target.value}))} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="r-active" checked={form.is_active} onChange={e => setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4" />
              <Label htmlFor="r-active">Active</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setModal(false); setSelected(null); }} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}