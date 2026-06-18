import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Monitor, Bus, Zap, Plus, Pencil, Trash2, Lock, Unlock, Wallet, RotateCcw, MapPin, ChevronDown, ChevronRight } from 'lucide-react';

const MACHINE_TYPES = { bus: 'Buss', tvm: 'Automat (TVM)', express: 'Express' };
const TYPE_ICONS = { bus: Bus, tvm: Monitor, express: Zap };

// ID ranges: bus 1000-4000, tvm/express 5000-8000
const getIdRange = (type) => type === 'bus' ? [1000, 4000] : [5000, 8000];

function generatePin() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function getNextId(machines, type) {
  const [min, max] = getIdRange(type);
  const usedIds = machines
    .filter(m => m.machine_type === type || (type !== 'bus' && (m.machine_type === 'tvm' || m.machine_type === 'express')))
    .map(m => parseInt((m.parent_machine_id || m.machine_id || '').slice(0, 4)))
    .filter(n => !isNaN(n) && n >= min && n <= max);
  for (let id = min; id <= max; id++) {
    if (!usedIds.includes(id)) return id.toString();
  }
  return (min + Math.floor(Math.random() * (max - min))).toString();
}

function getNextSuffix(machines, parentId) {
  const existing = machines
    .filter(m => m.parent_machine_id === parentId && m.machine_type === 'express')
    .map(m => parseInt(m.express_suffix || '0'));
  for (let i = 1; i <= 99; i++) {
    if (!existing.includes(i)) return i.toString().padStart(2, '0');
  }
  return '01';
}

export default function NewMachineManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [form, setForm] = useState({ name: '', machine_type: 'tvm', machine_id: '', parent_machine_id: '', express_suffix: '', location_id: '', location_name: '', terminal: '', access_pin: '' });
  const [cashNote, setCashNote] = useState('');
  const qc = useQueryClient();

  const { data: machines = [] } = useQuery({ queryKey: ['machines'], queryFn: () => base44.entities.MachineAccount.list() });
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: () => base44.entities.Location.list() });
  const { data: cashBalances = [] } = useQuery({ queryKey: ['cashbalances'], queryFn: () => base44.entities.CashBalance.list() });

  const upsert = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.MachineAccount.update(editing.id, data);
      return base44.entities.MachineAccount.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machines'] }); setModalOpen(false); setEditing(null); }
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.MachineAccount.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machines'] })
  });

  const toggleLock = useMutation({
    mutationFn: ({ id, val }) => base44.entities.MachineAccount.update(id, { force_locked: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machines'] })
  });

  const emptyCash = useMutation({
    mutationFn: async ({ machineId, machineName }) => {
      const existing = cashBalances.find(c => c.machine_id === machineId);
      const now = new Date().toISOString();
      if (existing) {
        return base44.entities.CashBalance.update(existing.id, { cash_total_kr: 0, last_emptied_at: now, emptied_by: 'Admin', notes: cashNote });
      } else {
        return base44.entities.CashBalance.create({ machine_id: machineId, machine_name: machineName, cash_total_kr: 0, card_total_kr: 0, last_emptied_at: now, emptied_by: 'Admin', notes: cashNote });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cashbalances'] }); setCashModalOpen(false); setCashNote(''); }
  });

  const getCashBalance = (machineId) => cashBalances.find(c => c.machine_id === machineId);

  const openAdd = () => {
    setEditing(null);
    const nextId = getNextId(machines, 'tvm');
    setForm({ name: '', machine_type: 'tvm', machine_id: nextId, parent_machine_id: '', express_suffix: '', location_id: locations[0]?.id || '', location_name: locations[0]?.name || '', terminal: '', access_pin: generatePin() });
    setModalOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({ name: m.name, machine_type: m.machine_type, machine_id: m.machine_id, parent_machine_id: m.parent_machine_id || '', express_suffix: m.express_suffix || '', location_id: m.location_id || '', location_name: m.location_name || '', terminal: m.terminal || '', access_pin: m.access_pin });
    setModalOpen(true);
  };

  const handleTypeChange = (type) => {
    const nextId = getNextId(machines, type);
    let suffix = '';
    let parentId = '';
    if (type === 'express') {
      parentId = nextId;
      suffix = '01';
    }
    setForm(f => ({ ...f, machine_type: type, machine_id: type === 'express' ? parentId + suffix : nextId, parent_machine_id: parentId, express_suffix: suffix }));
  };

  const handleParentChange = (parentId) => {
    const suffix = getNextSuffix(machines, parentId);
    setForm(f => ({ ...f, parent_machine_id: parentId, express_suffix: suffix, machine_id: parentId + suffix }));
  };

  const handleLocationChange = (locId) => {
    const loc = locations.find(l => l.id === locId);
    setForm(f => ({ ...f, location_id: locId, location_name: loc?.name || '' }));
  };

  const handleSubmit = () => {
    const data = { ...form };
    if (form.machine_type === 'express') {
      data.machine_id = form.parent_machine_id + form.express_suffix;
    }
    upsert.mutate(data);
  };

  // Group by location
  const byLocation = {};
  machines.forEach(m => {
    const key = m.location_name || 'Ukjent lokasjon';
    if (!byLocation[key]) byLocation[key] = [];
    byLocation[key].push(m);
  });

  const toggleLocation = (key) => setExpandedLocations(prev => ({ ...prev, [key]: !prev[key] }));

  const getDisplayId = (m) => m.machine_type === 'express' ? `${m.parent_machine_id}${m.express_suffix}` : m.machine_id;

  const TypeIcon = ({ type }) => {
    const Icon = TYPE_ICONS[type] || Monitor;
    return <Icon className="w-4 h-4" />;
  };

  // 4-digit parent IDs for express
  const parentIds = [...new Set(machines.filter(m => m.machine_type === 'bus' || m.machine_type === 'tvm').map(m => m.machine_id))];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Monitor className="w-5 h-5" /> Maskiner</h2>
        <Button size="sm" onClick={openAdd} disabled={locations.length === 0}><Plus className="w-4 h-4 mr-1" /> Ny maskin</Button>
      </div>

      {locations.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-4">
          ⚠️ Opprett lokasjoner først i "Lokasjoner"-fanen før du kan legge til maskiner.
        </div>
      )}

      {Object.entries(byLocation).map(([locName, locMachines]) => {
        const expanded = expandedLocations[locName] !== false; // default open
        return (
          <div key={locName} className="border rounded-lg mb-3 overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors" onClick={() => toggleLocation(locName)}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{locName}</span>
                <Badge variant="outline" className="text-xs">{locMachines.length} maskiner</Badge>
              </div>
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {expanded && (
              <div className="divide-y">
                {locMachines.map(m => {
                  const cash = getCashBalance(m.machine_id);
                  return (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded ${m.machine_type === 'bus' ? 'bg-blue-100' : m.machine_type === 'express' ? 'bg-purple-100' : 'bg-green-100'}`}>
                          <TypeIcon type={m.machine_type} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{getDisplayId(m)}</span>
                            <span className="text-sm">{m.name}</span>
                            <Badge variant="outline" className="text-xs">{MACHINE_TYPES[m.machine_type]}</Badge>
                            {m.force_locked && <Badge className="bg-red-100 text-red-700 text-xs">Sperret</Badge>}
                            {!m.is_active && <Badge className="bg-gray-100 text-gray-600 text-xs">Inaktiv</Badge>}
                          </div>
                          {m.terminal && <p className="text-xs text-gray-400">{m.terminal}</p>}
                          {cash && (
                            <p className="text-xs text-gray-500">
                              Kontant: <span className="font-medium">{cash.cash_total_kr} kr</span>
                              {cash.last_emptied_at && ` · Tømt: ${new Date(cash.last_emptied_at).toLocaleDateString('nb-NO')}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="Kassekontroll" onClick={() => { setSelectedMachine(m); setCashModalOpen(true); }}>
                          <Wallet className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => toggleLock.mutate({ id: m.id, val: !m.force_locked })}>
                          {m.force_locked ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-orange-500" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {machines.length === 0 && locations.length > 0 && (
        <p className="text-center text-gray-400 py-8">Ingen maskiner registrert ennå</p>
      )}

      {/* Add/Edit machine modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Rediger maskin' : 'Ny maskin'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Maskintype</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.machine_type} onChange={e => handleTypeChange(e.target.value)}>
                  <option value="bus">Buss (1000–4000)</option>
                  <option value="tvm">Automat TVM (5000–8000)</option>
                  <option value="express">Express (6-sifret)</option>
                </select>
              </div>
              <div>
                <Label>
                  {form.machine_type === 'express' ? 'Base-ID (4 siffer)' : 'Machine ID (4 siffer)'}
                </Label>
                {form.machine_type === 'express' ? (
                  <div className="flex gap-2">
                    <Input
                      value={form.parent_machine_id}
                      onChange={e => handleParentChange(e.target.value)}
                      placeholder="4404"
                      maxLength={4}
                    />
                    <Input
                      value={form.express_suffix}
                      onChange={e => setForm(f => ({ ...f, express_suffix: e.target.value, machine_id: f.parent_machine_id + e.target.value }))}
                      placeholder="01"
                      maxLength={2}
                      className="w-16"
                    />
                  </div>
                ) : (
                  <Input value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} maxLength={4} />
                )}
                {form.machine_type === 'express' && (
                  <p className="text-xs text-gray-400 mt-1">Full ID: <strong>{form.parent_machine_id}{form.express_suffix}</strong></p>
                )}
              </div>
            </div>

            {form.machine_type === 'express' && parentIds.length > 0 && (
              <div>
                <Label>Velg eksisterende base-maskin</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.parent_machine_id} onChange={e => handleParentChange(e.target.value)}>
                  <option value="">— Skriv inn manuelt —</option>
                  {parentIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
            )}

            <div>
              <Label>Navn</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="f.eks. Automat Bergen Busstasjon" />
            </div>

            <div>
              <Label>Lokasjon</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.location_id} onChange={e => handleLocationChange(e.target.value)}>
                <option value="">— Velg lokasjon —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <Label>Terminal / plattform (valgfri)</Label>
              <Input value={form.terminal} onChange={e => setForm(f => ({ ...f, terminal: e.target.value }))} placeholder="f.eks. Plattform 3" />
            </div>

            <div>
              <Label>Tilgangs-PIN (12 siffer)</Label>
              <div className="flex gap-2">
                <Input value={form.access_pin} onChange={e => setForm(f => ({ ...f, access_pin: e.target.value }))} maxLength={12} />
                <Button variant="outline" onClick={() => setForm(f => ({ ...f, access_pin: generatePin() }))}>Generer</Button>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!form.name || !form.machine_id || upsert.isPending}>
              {editing ? 'Lagre endringer' : 'Opprett maskin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash balance modal */}
      <Dialog open={cashModalOpen} onOpenChange={setCashModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kassekontroll — {selectedMachine?.name}</DialogTitle>
          </DialogHeader>
          {selectedMachine && (() => {
            const cash = getCashBalance(selectedMachine.machine_id);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Kontanter</p>
                    <p className="text-2xl font-bold">{cash?.cash_total_kr ?? 0} kr</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Kortbetaling</p>
                    <p className="text-2xl font-bold">{cash?.card_total_kr ?? 0} kr</p>
                  </div>
                </div>
                {cash?.last_emptied_at && (
                  <p className="text-sm text-gray-500 text-center">
                    Sist tømt: {new Date(cash.last_emptied_at).toLocaleString('nb-NO')}
                    {cash.emptied_by && ` av ${cash.emptied_by}`}
                  </p>
                )}
                <div>
                  <Label>Notat ved tømming (valgfri)</Label>
                  <Input value={cashNote} onChange={e => setCashNote(e.target.value)} placeholder="f.eks. rutinemessig tømming" />
                </div>
                <Button className="w-full" variant="destructive" onClick={() => emptyCash.mutate({ machineId: selectedMachine.machine_id, machineName: selectedMachine.name })} disabled={emptyCash.isPending}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Registrer tømming (nullstill kasse)
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}