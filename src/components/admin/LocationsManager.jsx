import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Pencil, Trash2, Copy, CheckCheck } from 'lucide-react';

const LOCATION_TYPES = {
  terminal: 'Terminal',
  bus_stop: 'Bussholdeplass',
  tram_stop: 'Trikk/Bybane',
  depot: 'Depot',
  office: 'Kontor',
  other: 'Annet'
};

const DEFAULT_LOCATIONS = [
  { name: 'Kundesenter Skyss Bergen', address: 'Strømgaten 8', city: 'Bergen', zip: '5008', location_type: 'office' },
  { name: 'Bergen Busstasjon', address: 'Strømgaten 8', city: 'Bergen', zip: '5008', location_type: 'terminal' },
  { name: 'Nonneseter', address: 'Kaigaten', city: 'Bergen', zip: '5014', location_type: 'tram_stop' },
  { name: 'Byparken', address: 'Olav Kyrres gate', city: 'Bergen', zip: '5014', location_type: 'tram_stop' },
];

export default function LocationsManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [form, setForm] = useState({ name: '', address: '', city: 'Bergen', zip: '', location_type: 'terminal' });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setModalOpen(false); setEditing(null); }
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] })
  });

  const bulkCreate = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        await base44.entities.Location.create(item);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setBulkOpen(false); setBulkText(''); }
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', address: 'Strømgaten 8', city: 'Bergen', zip: '5008', location_type: 'terminal' });
    setModalOpen(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address || '', city: loc.city || '', zip: loc.zip || '', location_type: loc.location_type || 'terminal' });
    setModalOpen(true);
  };

  const parseBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(',').map(s => s.trim());
      return {
        name: parts[0] || line,
        address: parts[1] || 'Strømgaten 8',
        city: parts[2] || 'Bergen',
        zip: parts[3] || '5008',
        location_type: parts[4] || 'terminal',
        is_active: true
      };
    });
  };

  const addDefaultLocations = () => {
    bulkCreate.mutate(DEFAULT_LOCATIONS);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5" /> Lokasjoner</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Copy className="w-4 h-4 mr-1" /> Bulk-opprett</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Ny lokasjon</Button>
        </div>
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="mb-4">Ingen lokasjoner ennå</p>
          <Button variant="outline" onClick={addDefaultLocations}>
            <CheckCheck className="w-4 h-4 mr-2" /> Legg til Skyss Bergen-lokasjoner
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {locations.map(loc => (
          <div key={loc.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{loc.name}</span>
                <Badge variant="outline" className="text-xs">{LOCATION_TYPES[loc.location_type] || loc.location_type}</Badge>
              </div>
              {loc.address && <p className="text-sm text-gray-500">{loc.address}, {loc.zip} {loc.city}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => openEdit(loc)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(loc.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Rediger lokasjon' : 'Ny lokasjon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Navn</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="f.eks. Bergen Busstasjon" />
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
              <Label>Type</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.location_type} onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}>
                {Object.entries(LOCATION_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate(form)} disabled={!form.name || upsert.isPending}>
              {editing ? 'Lagre endringer' : 'Opprett lokasjon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk-opprett lokasjoner</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">En lokasjon per linje. Format: <code className="bg-gray-100 px-1 rounded">Navn, Adresse, By, Postnr, Type</code></p>
            <p className="text-xs text-gray-400">Eksempel: Bergen Busstasjon, Strømgaten 8, Bergen, 5008, terminal</p>
            <textarea
              className="w-full border rounded-md p-3 text-sm font-mono h-40"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"Bergen Busstasjon, Strømgaten 8, Bergen, 5008, terminal\nNonneseter, Kaigaten, Bergen, 5014, tram_stop"}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={addDefaultLocations} disabled={bulkCreate.isPending}>
                Bruk Skyss Bergen-standard
              </Button>
              <Button className="flex-1" onClick={() => bulkCreate.mutate(parseBulk())} disabled={!bulkText.trim() || bulkCreate.isPending}>
                {bulkCreate.isPending ? 'Oppretter...' : `Opprett ${parseBulk().length} lokasjoner`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}