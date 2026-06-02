import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Handshake } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_COLORS = { transport:'bg-blue-100 text-blue-700', retail:'bg-orange-100 text-orange-700', hospitality:'bg-pink-100 text-pink-700', government:'bg-slate-100 text-slate-700', other:'bg-gray-100 text-gray-600' };
const EMPTY = { name: '', type: 'transport', contact_name: '', email: '', phone: '', discount_rate: 0, revenue_share: 0, is_active: true, contract_start: '', contract_end: '', notes: '' };

export default function PartnersManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: () => base44.entities.Partner.list() });
  const create = useMutation({ mutationFn: d => base44.entities.Partner.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); toast.success('Partner added'); setModal(false); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Partner.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); toast.success('Updated'); setModal(false); } });
  const del = useMutation({ mutationFn: id => base44.entities.Partner.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); toast.success('Deleted'); } });

  const openCreate = () => { setSelected(null); setForm(EMPTY); setModal(true); };
  const openEdit = p => { setSelected(p); setForm({ name: p.name, type: p.type||'other', contact_name: p.contact_name||'', email: p.email||'', phone: p.phone||'', discount_rate: p.discount_rate||0, revenue_share: p.revenue_share||0, is_active: p.is_active!==false, contract_start: p.contract_start||'', contract_end: p.contract_end||'', notes: p.notes||'' }); setModal(true); };

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const d = { ...form, discount_rate: Number(form.discount_rate)||0, revenue_share: Number(form.revenue_share)||0 };
    selected ? update.mutate({ id: selected.id, d }) : create.mutate(d);
  };

  const isExpired = p => p.contract_end && new Date(p.contract_end) < new Date();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partners</h2>
          <p className="text-gray-500 text-sm mt-1">Business partners with revenue-sharing or discount agreements</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Partner</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {partners.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border p-5 space-y-3 ${isExpired(p) ? 'border-red-200 opacity-70' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[p.type]||TYPE_COLORS.other}`}>{p.type}</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${isExpired(p) ? 'bg-red-100 text-red-600' : p.is_active!==false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {isExpired(p) ? 'Expired' : p.is_active!==false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              {p.contact_name && <p>👤 {p.contact_name}</p>}
              {p.email && <p>✉ {p.email}</p>}
              {p.phone && <p>📞 {p.phone}</p>}
            </div>
            <div className="flex gap-2 text-xs flex-wrap">
              {p.discount_rate > 0 && <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold">{p.discount_rate}% discount</span>}
              {p.revenue_share > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-bold">{p.revenue_share}% rev share</span>}
              {p.contract_end && <span className="bg-gray-50 text-gray-500 px-2 py-1 rounded-full">Until {new Date(p.contract_end).toLocaleDateString('nb-NO')}</span>}
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete partner?')) del.mutate(p.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {partners.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Handshake className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No partners yet.</p>
          </div>
        )}
      </div>

      <Dialog open={modal} onOpenChange={() => { setModal(false); setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected ? 'Edit Partner' : 'Add Partner'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
              <div>
                <Label>Type</Label>
                <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-transparent">
                  {['transport','retail','hospitality','government','other'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Person</Label><Input value={form.contact_name} onChange={e => setForm(f=>({...f,contact_name:e.target.value}))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div><Label>Discount %</Label><Input type="number" min="0" value={form.discount_rate} onChange={e => setForm(f=>({...f,discount_rate:e.target.value}))} /></div>
              <div><Label>Rev Share %</Label><Input type="number" min="0" value={form.revenue_share} onChange={e => setForm(f=>({...f,revenue_share:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contract Start</Label><Input type="date" value={form.contract_start} onChange={e => setForm(f=>({...f,contract_start:e.target.value}))} /></div>
              <div><Label>Contract End</Label><Input type="date" value={form.contract_end} onChange={e => setForm(f=>({...f,contract_end:e.target.value}))} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="p-active" checked={form.is_active} onChange={e => setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4" />
              <Label htmlFor="p-active">Active</Label>
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