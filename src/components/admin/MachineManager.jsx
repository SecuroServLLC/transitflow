import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Lock, Unlock, DollarSign, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

function genMachineId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
function genPin() {
  let p = '';
  for (let i = 0; i < 12; i++) p += Math.floor(Math.random() * 10);
  return p;
}

const EMPTY = { name: '', terminal: '', platform: '', machine_id: '', access_pin: '', is_active: true, force_locked: false };

export default function MachineManager() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [cashModal, setCashModal] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const qc = useQueryClient();

  const { data: list = [] } = useQuery({ queryKey: ['machines'], queryFn: () => base44.entities.MachineAccount.list() });

  const create = useMutation({
    mutationFn: d => base44.entities.MachineAccount.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); toast.success('Machine created'); setModal(false); }
  });
  const update = useMutation({
    mutationFn: ({ id, d }) => base44.entities.MachineAccount.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); toast.success('Updated'); setModal(false); }
  });
  const del = useMutation({
    mutationFn: id => base44.entities.MachineAccount.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); toast.success('Deleted'); }
  });

  const toggleLock = async (m) => {
    const newLocked = !m.force_locked;
    await base44.entities.MachineAccount.update(m.id, { force_locked: newLocked, session_token: newLocked ? '' : m.session_token });
    qc.invalidateQueries({ queryKey: ['machines'] });
    toast.success(newLocked ? 'Machine force-locked' : 'Machine unlocked');
  };

  const emptyCash = async (m) => {
    await base44.entities.MachineAccount.update(m.id, { cash_balance: 0, last_emptied: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ['machines'] });
    toast.success('Cash balance cleared');
    setCashModal(null);
  };

  const open = (item) => {
    setSelected(item || null);
    setForm(item ? { ...item } : { ...EMPTY, machine_id: genMachineId(), access_pin: genPin() });
    setModal(true);
  };

  const save = () => {
    if (!form.name || !form.machine_id || !form.access_pin) { toast.error('Name, Machine ID and PIN are required'); return; }
    selected ? update.mutate({ id: selected.id, d: form }) : create.mutate(form);
  };

  // Group machines by terminal
  const grouped = list.reduce((acc, m) => {
    const key = m.terminal || '(No Terminal)';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const terminals = Object.keys(grouped).sort();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ticket Machines (TVM)</h2>
          <p className="text-sm text-gray-500 mt-1">Login URL: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/system/tvm</code> — Machines are grouped by Terminal</p>
        </div>
        <Button onClick={() => open(null)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Machine
        </Button>
      </div>

      <div className="space-y-4">
        {terminals.map(terminal => {
          const machines = grouped[terminal];
          const isOpen = collapsed[terminal] !== true;
          const totalCash = machines.reduce((s, m) => s + (m.cash_balance || 0), 0);
          const activeLive = machines.filter(m => m.session_token && !m.force_locked).length;

          return (
            <div key={terminal} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Terminal header */}
              <button
                onClick={() => setCollapsed(c => ({ ...c, [terminal]: !isOpen }))}
                className="w-full px-5 py-4 flex items-center justify-between bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <div className="text-left">
                    <p className="font-bold text-gray-900">📍 {terminal}</p>
                    <p className="text-xs text-gray-500">{machines.length} machine{machines.length !== 1 ? 's' : ''}{activeLive > 0 ? ` · ${activeLive} live` : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-700 font-bold text-sm">{totalCash.toLocaleString()} kr cash</p>
                  <p className="text-xs text-gray-400">total in terminal</p>
                </div>
              </button>

              {isOpen && (
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-gray-100">
                    <tr>
                      {['Name', 'Platform', 'Machine ID', 'PIN', 'Cash', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map(m => (
                      <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{m.name}</td>
                        <td className="px-4 py-3 text-gray-500">{m.platform || '—'}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 text-xs tracking-widest">{m.machine_id}</td>
                        <td className="px-4 py-3 font-mono text-gray-400 text-xs">{m.access_pin || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setCashModal(m)} className="text-green-600 font-bold hover:underline text-xs flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />{(m.cash_balance || 0).toLocaleString()} kr
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-fit ${m.is_active && !m.force_locked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {m.force_locked ? 'Force Locked' : m.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {m.session_token && !m.force_locked && <span className="text-[10px] text-blue-500">● Live Session</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => open(m)}><Pencil className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleLock(m)} title={m.force_locked ? 'Unlock' : 'Force Lock'}>
                              {m.force_locked ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-orange-500" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete machine?')) del.mutate(m.id); }}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center text-gray-400">
            No machines configured yet. Add your first machine above.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modal} onOpenChange={() => setModal(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Machine' : 'Add Machine'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Machine Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="TVM 1" /></div>
            <div>
              <Label>Terminal (Location Group)</Label>
              <Input value={form.terminal} onChange={e => setForm(f => ({ ...f, terminal: e.target.value }))} placeholder="e.g. Central Station" />
              <p className="text-xs text-gray-400 mt-1">Machines with the same terminal are grouped together</p>
            </div>
            <div><Label>Platform / Bay</Label><Input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="e.g. Platform 3" /></div>
            <div>
              <Label>Machine ID *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value.toUpperCase() }))} className="font-mono font-bold tracking-widest text-center text-lg" maxLength={6} />
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, machine_id: genMachineId() }))}><RefreshCw className="w-4 h-4" /></Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">6-char ID entered at the machine during setup</p>
            </div>
            <div>
              <Label>Access PIN (12-digit) *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.access_pin} onChange={e => setForm(f => ({ ...f, access_pin: e.target.value }))} className="font-mono tracking-widest text-center" maxLength={12} />
                <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, access_pin: genPin() }))}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Balance Modal */}
      {cashModal && (
        <Dialog open={!!cashModal} onOpenChange={() => setCashModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cash Balance — {cashModal.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cash in Machine', value: `${(cashModal.cash_balance || 0).toLocaleString()} kr`, color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Card Collected', value: `${(cashModal.card_balance || 0).toLocaleString()} kr`, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Total Transactions', value: cashModal.total_transactions || 0, color: 'text-purple-700', bg: 'bg-purple-50' },
                  { label: 'Last Emptied', value: cashModal.last_emptied ? new Date(cashModal.last_emptied).toLocaleDateString() : 'Never', color: 'text-gray-700', bg: 'bg-gray-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Terminal: {cashModal.terminal || '—'} · Platform: {cashModal.platform || '—'} · ID: <span className="font-mono font-bold">{cashModal.machine_id}</span></p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCashModal(null)} className="flex-1">Close</Button>
                <Button onClick={() => emptyCash(cashModal)} className="flex-1 bg-green-600 hover:bg-green-700">Mark Cash as Emptied</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}