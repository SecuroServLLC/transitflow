import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function genBadgeId() {
  return 'INS-' + Math.floor(100 + Math.random() * 900);
}
function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const EMPTY = { name: '', badge_id: '', pin: '', is_active: true };

export default function InspectorsManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showPin, setShowPin] = useState({});
  const qc = useQueryClient();

  const { data: inspectors = [] } = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => base44.entities.Inspector.list()
  });

  const create = useMutation({
    mutationFn: d => base44.entities.Inspector.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Inspector created'); setModal(false); }
  });
  const update = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Inspector.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Updated'); setModal(false); }
  });
  const del = useMutation({
    mutationFn: id => base44.entities.Inspector.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inspectors'] }); toast.success('Deleted'); }
  });
  const toggleActive = useMutation({
    mutationFn: ({ id, val }) => base44.entities.Inspector.update(id, { is_active: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspectors'] })
  });

  const open = (item) => {
    setSelected(item || null);
    setForm(item
      ? { name: item.name, badge_id: item.badge_id || '', pin: item.pin || '', is_active: item.is_active !== false }
      : { name: '', badge_id: genBadgeId(), pin: genPin(), is_active: true }
    );
    setModal(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.badge_id.trim()) { toast.error('Badge ID required'); return; }
    if (!form.pin.trim()) { toast.error('PIN required'); return; }
    const d = { name: form.name, badge_id: form.badge_id.toUpperCase(), pin: form.pin, is_active: form.is_active };
    selected ? update.mutate({ id: selected.id, d }) : create.mutate(d);
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inspectors</h2>
          <p className="text-sm text-gray-500 mt-1">Login URL: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/system/inspect</code></p>
        </div>
        <Button onClick={() => open(null)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Inspector
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Badge ID', 'PIN', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inspectors.map(i => (
              <tr key={i.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono font-bold">{i.badge_id}</code>
                    <button onClick={() => copy(i.badge_id)} className="text-gray-400 hover:text-blue-500"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {showPin[i.id] ? i.pin : '••••'}
                    </code>
                    <button onClick={() => setShowPin(s => ({ ...s, [i.id]: !s[i.id] }))} className="text-gray-400 hover:text-blue-500 text-xs">
                      {showPin[i.id] ? 'hide' : 'show'}
                    </button>
                    <button onClick={() => copy(i.pin)} className="text-gray-400 hover:text-blue-500"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive.mutate({ id: i.id, val: !(i.is_active !== false) })}
                    className={`px-2 py-1 rounded-full text-xs font-bold ${i.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {i.is_active !== false ? '✓ Active' : '✗ Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => open(i)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete inspector?')) del.mutate(i.id); }}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {inspectors.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No inspectors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modal} onOpenChange={() => setModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Inspector' : 'Add Inspector'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lars Hansen" />
            </div>
            <div>
              <Label>Badge ID *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.badge_id} onChange={e => setForm(f => ({ ...f, badge_id: e.target.value.toUpperCase() }))} placeholder="INS-001" className="font-mono font-bold tracking-widest" />
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, badge_id: genBadgeId() }))} title="Generate">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Used to log in at <code>/system/inspect</code></p>
            </div>
            <div>
              <Label>PIN *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="4-6 digit PIN" className="font-mono tracking-widest text-center" maxLength={6} />
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, pin: genPin() }))}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="iactive" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
              <Label htmlFor="iactive">Active (can log in)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save Inspector</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}