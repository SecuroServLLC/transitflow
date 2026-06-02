import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name:'', location:'', username:'', password:'', is_active:true };

export default function MachineManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const { data: list = [] } = useQuery({ queryKey: ['machines'], queryFn: () => base44.entities.MachineAccount.list() });
  const create = useMutation({ mutationFn: d => base44.entities.MachineAccount.create(d), onSuccess: () => { qc.invalidateQueries({queryKey:['machines']}); toast.success('Created'); setModal(false); } });
  const update = useMutation({ mutationFn: ({id,d}) => base44.entities.MachineAccount.update(id,d), onSuccess: () => { qc.invalidateQueries({queryKey:['machines']}); toast.success('Updated'); setModal(false); } });
  const del = useMutation({ mutationFn: id => base44.entities.MachineAccount.delete(id), onSuccess: () => { qc.invalidateQueries({queryKey:['machines']}); toast.success('Deleted'); } });

  const open = (item) => { setSelected(item||null); setForm(item ? {...item} : EMPTY); setModal(true); };
  const save = () => {
    if (!form.name||!form.username||!form.password) { toast.error('Fill all fields'); return; }
    selected ? update.mutate({id:selected.id, d:form}) : create.mutate(form);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ticket Machines</h2>
        <Button onClick={() => open(null)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Machine</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','Location','Username','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map(m => (
              <tr key={m.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-gray-500">{m.location||'—'}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{m.username}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => open(m)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete?')) del.mutate(m.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No machines yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={() => setModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Machine' : 'Add Machine'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Main Station Machine" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Platform 1" /></div>
            <div><Label>Username *</Label><Input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} /></div>
            <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>
            <div className="flex items-center gap-3"><Switch checked={!!form.is_active} onCheckedChange={v=>setForm(f=>({...f,is_active:v}))} /><Label>Active</Label></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}