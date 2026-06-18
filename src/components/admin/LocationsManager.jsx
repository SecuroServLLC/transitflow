import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Pencil, Search, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const LOCATION_TYPES = {
  terminal: 'Terminal',
  bus_stop: 'Bussholdeplass',
  tram_stop: 'Trikk/Bybane',
  depot: 'Depot',
  office: 'Kontor',
  other: 'Annet'
};

const TYPE_COLORS = {
  terminal: 'bg-blue-100 text-blue-700',
  bus_stop: 'bg-green-100 text-green-700',
  tram_stop: 'bg-purple-100 text-purple-700',
  depot: 'bg-orange-100 text-orange-700',
  office: 'bg-gray-100 text-gray-700',
  other: 'bg-slate-100 text-slate-600',
};

export default function LocationsManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [dupWarning, setDupWarning] = useState('');
  const [form, setForm] = useState({ name: '', address: '', city: 'Bergen', zip: '', location_type: 'bus_stop', notes: '' });
  const qc = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list()
  });

  const upsert = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.Location.update(editing.id, data);
      return base44.entities.Location.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setModalOpen(false); setEditing(null); setDupWarning(''); }
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', address: '', city: 'Bergen', zip: '', location_type: 'bus_stop', notes: '' });
    setDupWarning('');
    setModalOpen(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address || '', city: loc.city || '', zip: loc.zip || '', location_type: loc.location_type || 'bus_stop', notes: loc.notes || '' });
    setDupWarning('');
    setModalOpen(true);
  };

  const checkDuplicate = (name) => {
    const normalized = name.trim().toLowerCase();
    const existing = locations.find(l => l.name.trim().toLowerCase() === normalized && (!editing || l.id !== editing.id));
    setDupWarning(existing ? `⚠️ En lokasjon med navn "${existing.name}" finnes allerede!` : '');
  };

  const handleSubmit = () => {
    if (dupWarning) return;
    upsert.mutate({ ...form, is_active: true });
  };

  // Group by notes field (used as zone/area)
  const filtered = locations.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach(loc => {
    const group = loc.notes || 'Ukategorisert';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(loc);
  });
  const groupKeys = Object.keys(grouped).sort();

  const toggleGroup = (k) => setExpandedGroups(prev => ({ ...prev, [k]: prev[k] === false ? true : false }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" /> Lokasjoner
          <Badge variant="outline">{locations.length}</Badge>
        </h2>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Ny lokasjon</Button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk etter navn eller by..." className="pl-9" />
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Ingen lokasjoner ennå. Klikk "Ny lokasjon" for å begynne, eller bruk Root-siden for masseimport.</p>
        </div>
      )}

      <div className="space-y-2">
        {groupKeys.map(group => {
          const items = grouped[group];
          const isOpen = expandedGroups[group] !== false;
          return (
            <div key={group} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => toggleGroup(group)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="font-medium text-sm">{group}</span>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>
              </button>
              {isOpen && (
                <div className="divide-y">
                  {items.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLORS[loc.location_type] || 'bg-gray-100 text-gray-600'}`}>
                          {LOCATION_TYPES[loc.location_type] || loc.location_type}
                        </span>
                        <span className="font-medium text-sm truncate">{loc.name}</span>
                        {loc.address && <span className="text-xs text-gray-400 hidden md:block">{loc.address}</span>}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(loc)}><Pencil className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Rediger lokasjon' : 'Ny lokasjon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Navn *</Label>
              <Input
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); checkDuplicate(e.target.value); }}
                placeholder="f.eks. Bergen Busstasjon"
              />
              {dupWarning && (
                <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                  <AlertTriangle className="w-3 h-3" /> {dupWarning}
                </div>
              )}
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.location_type} onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}>
                {Object.entries(LOCATION_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Adresse (valgfri)</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Strømgaten 8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Postnummer</Label>
                <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="5008" />
              </div>
              <div>
                <Label>By</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Bergen" />
              </div>
            </div>
            <div>
              <Label>Sone / Område (brukes til gruppering)</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="f.eks. Sentrum, Fana, Åsane..." />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!form.name || !!dupWarning || upsert.isPending}>
              {editing ? 'Lagre endringer' : 'Opprett lokasjon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}