import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

function genCode(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}
function genUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random() * 99);
}

export default function InspectorsManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', access_code: '', is_active: true });
  const [showCode, setShowCode] = useState({});
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({ queryKey: ['inspectors'], queryFn: () => base44.entities.Inspector.list() });
  const create = useMutation({ mutationFn: d => base44.entities.Inspector.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Inspector created'); setModal(false); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Inspector.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Updated'); setModal(false); } });
  const del = useMutation({ mutationFn: id => base44.entities.Inspector.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Deleted'); } });
  const toggleActive = useMutation({ mutationFn: ({ id, val }) => base44.entities.Inspector.update(id, { is_active: val }), onSuccess: () => qc.invalidateQueries({ queryKey: ['inspectors'] }) });

  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', username: '', access_code: genCode(8), is_active: true });
    setModal(true);
  };
  const openEdit = i => {
    setSelected(i);
    setForm({ name: i.name, username: i.username || '', access_code: i.access_code || '', is_active: i.is_active !== false });
    setModal(true);
  };
  const autoFill = () => setForm(f => ({ ...f, username: genUsername(f.name || 'inspector'), access_code: genCode(8) }));

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.username.trim()) { toast.error('Username required'); return; }
    if (!form.access_code.trim()) { toast.error('Access code required'); return; }
    const d = { name: form.name, username: form.username.toLowerCase(), access_code: form.access_code.toUpperCase(), is_active: form.is_active };
    selected ? update.mutate({ id: selected.id, d }) : create.mutate(d);
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inspectors</h2>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Inspector</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Name','Username','Access Code','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {inspectors.map(i => (
              <tr key={i.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{i.username}</code>
                    <button onClick={() => copy(i.username)} className="text-gray-400 hover:text-blue-500"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono">
                      {showCode[i.id] ? i.access_code : '••••••••'}
                    </code>
                    <button onClick={() => setShowCode(s => ({...s, [i.id]: !s[i.id]}))} className="text-gray-400 hover:text-blue-500 text-xs">{showCode[i.id] ? 'hide' : 'show'}</button>
                    <button onClick={() => copy(i.access_code)} className="text-gray-400 hover:text-blue-500"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive.mutate({ id: i.id, val: !i.is_active })}
                    className={`px-2 py-1 rounded-full text-xs font-bold ${i.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {i.is_active !== false ? '✓ Active' : '✗ Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete inspector?')) del.mutate(i.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </td>
              </tr>
            ))}
            {inspectors.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No inspectors yet. Add one to get started.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={() => { setModal(false); setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Inspector' : 'Add Inspector'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name *</Label>
              <div className="flex gap-2">
                <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Lars Hansen" className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={autoFill} title="Auto-generate username & code">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div><Label>Username *</Label><Input value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} placeholder="e.g. lars.hansen01" /></div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Access Code *</Label>
                <button type="button" onClick={() => setForm(f => ({...f, access_code: genCode(8)}))} className="text-xs text-blue-600 hover:underline">Generate new</button>
              </div>
              <Input value={form.access_code} onChange={e => setForm(f => ({...f, access_code: e.target.value.toUpperCase()}))} className="font-mono tracking-widest" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} className="w-4 h-4" />
              <Label htmlFor="active">Active (can log in)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setModal(false); setSelected(null); }} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save Inspector</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}