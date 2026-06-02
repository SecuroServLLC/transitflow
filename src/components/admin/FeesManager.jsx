import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Coins } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_COLORS = { surcharge:'bg-red-100 text-red-700', service_fee:'bg-blue-100 text-blue-700', platform_fee:'bg-purple-100 text-purple-700', tax:'bg-yellow-100 text-yellow-700' };
const APPLIES_LABELS = { cashier:'💼 Cashier', machine:'🖥 Machine', online:'🌐 Online', all:'🌍 All channels' };
const EMPTY = { name: '', type: 'surcharge', applies_to: 'all', amount_kr: 0, amount_percent: 0, is_active: true, description: '' };

export default function FeesManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const { data: fees = [] } = useQuery({ queryKey: ['fees'], queryFn: () => base44.entities.Fee.list() });
  const create = useMutation({ mutationFn: d => base44.entities.Fee.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Fee created'); setModal(false); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Fee.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Updated'); setModal(false); } });
  const del = useMutation({ mutationFn: id => base44.entities.Fee.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Deleted'); } });
  const toggleActive = useMutation({ mutationFn: ({ id, val }) => base44.entities.Fee.update(id, { is_active: val }), onSuccess: () => qc.invalidateQueries({ queryKey: ['fees'] }) });

  const openCreate = () => { setSelected(null); setForm(EMPTY); setModal(true); };
  const openEdit = f => { setSelected(f); setForm({ name: f.name, type: f.type, applies_to: f.applies_to||'all', amount_kr: f.amount_kr||0, amount_percent: f.amount_percent||0, is_active: f.is_active!==false, description: f.description||'' }); setModal(true); };

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const d = { ...form, amount_kr: Number(form.amount_kr)||0, amount_percent: Number(form.amount_percent)||0 };
    selected ? update.mutate({ id: selected.id, d }) : create.mutate(d);
  };

  const feeDisplay = f => {
    const parts = [];
    if (f.amount_kr > 0) parts.push(`+${f.amount_kr} kr`);
    if (f.amount_percent > 0) parts.push(`+${f.amount_percent}%`);
    return parts.join(' + ') || 'No charge';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fees & Surcharges</h2>
          <p className="text-gray-500 text-sm mt-1">Configure fees applied at different purchase channels</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Fee</Button>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {['cashier','machine','online','all'].map(channel => {
          const channelFees = fees.filter(f => (f.applies_to === channel || f.applies_to === 'all') && f.is_active !== false);
          const totalKr = channelFees.reduce((s, f) => s + (f.amount_kr||0), 0);
          return (
            <div key={channel} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 capitalize">{APPLIES_LABELS[channel]}</p>
              <p className="text-2xl font-black text-gray-800 mt-1">{totalKr} kr</p>
              <p className="text-xs text-gray-400">{channelFees.length} active fees</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','Type','Applies To','Charge','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{f.name}</p>
                  {f.description && <p className="text-xs text-gray-400">{f.description}</p>}
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${TYPE_COLORS[f.type]||'bg-gray-100'}`}>{(f.type||'').replace('_',' ')}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{APPLIES_LABELS[f.applies_to]||f.applies_to}</td>
                <td className="px-4 py-3 font-bold text-gray-800">{feeDisplay(f)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive.mutate({ id: f.id, val: !f.is_active })}
                    className={`px-2 py-1 rounded-full text-xs font-bold ${f.is_active!==false?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                    {f.is_active!==false?'Active':'Off'}
                  </button>
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete fee?')) del.mutate(f.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </td>
              </tr>
            ))}
            {fees.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No fees configured.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={() => { setModal(false); setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Fee' : 'Add Fee / Surcharge'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Cashier Surcharge" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-transparent">
                  <option value="surcharge">Surcharge</option>
                  <option value="service_fee">Service Fee</option>
                  <option value="platform_fee">Platform Fee</option>
                  <option value="tax">Tax</option>
                </select>
              </div>
              <div>
                <Label>Applies To</Label>
                <select value={form.applies_to} onChange={e => setForm(f=>({...f,applies_to:e.target.value}))} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-transparent">
                  <option value="all">All channels</option>
                  <option value="cashier">Cashier only</option>
                  <option value="machine">Machine only</option>
                  <option value="online">Online only</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fixed Amount (kr)</Label><Input type="number" min="0" step="0.5" value={form.amount_kr} onChange={e => setForm(f=>({...f,amount_kr:e.target.value}))} /></div>
              <div><Label>Percentage (%)</Label><Input type="number" min="0" step="0.1" value={form.amount_percent} onChange={e => setForm(f=>({...f,amount_percent:e.target.value}))} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="fee-active" checked={form.is_active} onChange={e => setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4" />
              <Label htmlFor="fee-active">Active</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setModal(false); setSelected(null); }} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save Fee</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}