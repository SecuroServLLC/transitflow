import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Bus, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function genCode(len = 8) { return Math.random().toString(36).substring(2, 2+len).toUpperCase(); }
function genUsername(name) { return name.trim().toLowerCase().replace(/\s+/, '.') + Math.floor(Math.random()*99); }
function genEmpId() { return 'BD-' + Math.floor(10000 + Math.random()*90000); }

const EMPTY = { name: '', employee_id: '', username: '', access_code: '', route: '', is_active: true };

export default function BusDriversManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showCode, setShowCode] = useState({});
  const qc = useQueryClient();

  const { data: drivers = [] } = useQuery({ queryKey: ['bus-drivers'], queryFn: () => base44.entities.BusDriver.list() });
  const create = useMutation({ mutationFn: d => base44.entities.BusDriver.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bus-drivers'] }); toast.success('Driver added'); setModal(false); } });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.BusDriver.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bus-drivers'] }); toast.success('Updated'); setModal(false); } });
  const del = useMutation({ mutationFn: id => base44.entities.BusDriver.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bus-drivers'] }); toast.success('Deleted'); } });
  const toggleActive = useMutation({ mutationFn: ({ id, val }) => base44.entities.BusDriver.update(id, { is_active: val }), onSuccess: () => qc.invalidateQueries({ queryKey: ['bus-drivers'] }) });

  const openCreate = () => {
    setSelected(null);
    setForm({ ...EMPTY, employee_id: genEmpId(), access_code: genCode(8) });
    setModal(true);
  };
  const openEdit = d => { setSelected(d); setForm({ name: d.name, employee_id: d.employee_id||'', username: d.username||'', access_code: d.access_code||'', route: d.route||'', is_active: d.is_active!==false }); setModal(true); };
  const autoFill = () => setForm(f => ({ ...f, username: genUsername(f.name||'driver'), access_code: genCode(8) }));

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.username.trim()) { toast.error('Username required'); return; }
    if (!form.access_code.trim()) { toast.error('Access code required'); return; }
    const d = { ...form };
    selected ? update.mutate({ id: selected.id, d }) : create.mutate(d);
  };

  const copy = t => { navigator.clipboard.writeText(t); toast.success('Copied!'); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bus Drivers</h2>
          <p className="text-gray-500 text-sm mt-1">Drivers who can validate tickets on-board</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Driver</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Employee','Name','Route','Username','Access Code','Status','Actions'].map(h => <th key={h} className="text-left px-3 py-3 text-gray-600 font-medium text-xs">{h}</th>)}</tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-3 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{d.employee_id||'—'}</code></td>
                <td className="px-3 py-3 font-medium">{d.name}</td>
                <td className="px-3 py-3 text-gray-500">{d.route||'—'}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{d.username}</code>
                    <button onClick={() => copy(d.username)} className="text-gray-400 hover:text-blue-500"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{showCode[d.id] ? d.access_code : '••••••••'}</code>
                    <button onClick={() => setShowCode(s=>({...s,[d.id]:!s[d.id]}))} className="text-gray-400 hover:text-blue-500 text-xs">{showCode[d.id]?'hide':'show'}</button>
                    <button onClick={() => copy(d.access_code)} className="text-gray-400 hover:text-blue-500"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => toggleActive.mutate({ id: d.id, val: !d.is_active })}
                    className={`px-2 py-1 rounded-full text-xs font-bold ${d.is_active!==false?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                    {d.is_active!==false?'Active':'Inactive'}
                  </button>
                </td>
                <td className="px-3 py-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete driver?')) del.mutate(d.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No drivers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={() => { setModal(false); setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Driver' : 'Add Driver'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name *</Label>
              <div className="flex gap-2">
                <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={autoFill}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employee ID</Label><Input value={form.employee_id} onChange={e => setForm(f=>({...f,employee_id:e.target.value}))} /></div>
              <div><Label>Assigned Route</Label><Input value={form.route} onChange={e => setForm(f=>({...f,route:e.target.value}))} placeholder="e.g. Line 42" /></div>
            </div>
            <div><Label>Username *</Label><Input value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} /></div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Access Code *</Label>
                <button type="button" onClick={() => setForm(f=>({...f,access_code:genCode(8)}))} className="text-xs text-blue-600 hover:underline">Generate</button>
              </div>
              <Input value={form.access_code} onChange={e => setForm(f=>({...f,access_code:e.target.value.toUpperCase()}))} className="font-mono tracking-widest" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="drv-active" checked={form.is_active} onChange={e => setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4" />
              <Label htmlFor="drv-active">Active</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setModal(false); setSelected(null); }} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save Driver</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}