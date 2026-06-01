import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InspectorsManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', pin: '' });
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });

  const create = useMutation({ mutationFn: d => base44.entities.Inspector.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Inspector added'); setModal(false); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Inspector.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Updated'); setModal(false); } });
  const remove = useMutation({ mutationFn: id => base44.entities.Inspector.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Deleted'); } });

  const openCreate = () => { setSelected(null); setForm({ name: '', pin: '' }); setModal(true); };
  const openEdit = i => { setSelected(i); setForm({ name: i.name, pin: i.pin }); setModal(true); };

  const save = () => {
    if (!form.name.trim() || !form.pin.trim()) { toast.error('Name and PIN required'); return; }
    selected ? update.mutate({ id: selected.id, d: form }) : create.mutate(form);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inspectors</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Inspector</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','PIN','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {inspectors.map(i => (
              <tr key={i.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded text-xs tracking-widest">{i.pin}</code></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete inspector?')) remove.mutate(i.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {inspectors.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No inspectors yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={() => { setModal(false); setSelected(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{selected ? 'Edit Inspector' : 'Add Inspector'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>PIN *</Label><Input value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))} placeholder="e.g. 1234" /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setModal(false); setSelected(null); }} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}