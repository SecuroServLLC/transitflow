import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Pencil, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';

const TICKET_TYPE_LABELS = { adult: 'Voksen', child: 'Barn', senior: 'Honnør', student: 'Student', military: 'Militær' };
const CATEGORY_LABELS = { single: 'Enkeltbillett', period: 'Periodebillett 30d' };

const STATUS_COLORS = { active: 'bg-green-100 text-green-800', blocked: 'bg-red-100 text-red-800', expired: 'bg-gray-100 text-gray-800' };
const STATUS_LABELS = { active: 'Aktiv', blocked: 'Sperret', expired: 'Utgått' };

const generateCardNumber = () => {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
};

export default function TransitCardManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    card_number: '', customer_name: '', status: 'active',
    balance_credits: 0, is_registered: false,
    favorite_ticket_type: 'adult', favorite_ticket_category: 'single', notes: ''
  });
  const qc = useQueryClient();

  const { data: cards = [] } = useQuery({
    queryKey: ['transitcards'],
    queryFn: () => base44.entities.TransitCard.list()
  });

  const upsert = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.TransitCard.update(editing.id, data);
      return base44.entities.TransitCard.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transitcards'] }); setModalOpen(false); setEditing(null); }
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.TransitCard.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transitcards'] })
  });

  const toggleBlock = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TransitCard.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transitcards'] })
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ card_number: generateCardNumber(), customer_name: '', status: 'active', balance_credits: 0, is_registered: false, favorite_ticket_type: 'adult', favorite_ticket_category: 'single', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({ card_number: card.card_number, customer_name: card.customer_name || '', status: card.status, balance_credits: card.balance_credits || 0, is_registered: card.is_registered || false, favorite_ticket_type: card.favorite_ticket_type || 'adult', favorite_ticket_category: card.favorite_ticket_category || 'single', notes: card.notes || '' });
    setModalOpen(true);
  };

  const filtered = cards.filter(c =>
    c.card_number?.includes(search) || (c.customer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5" /> TransitKort</h2>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Nytt kort</Button>
      </div>

      <Input className="mb-4" placeholder="Søk kortnummer eller navn..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Kortnummer</th>
              <th className="pb-2 pr-4">Navn</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Saldo</th>
              <th className="pb-2 pr-4">Favorittbillett</th>
              <th className="pb-2">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(card => (
              <tr key={card.id} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4 font-mono">{card.card_number}</td>
                <td className="py-2 pr-4">{card.customer_name || <span className="text-gray-400">—</span>}</td>
                <td className="py-2 pr-4">
                  <Badge className={STATUS_COLORS[card.status]}>{STATUS_LABELS[card.status]}</Badge>
                </td>
                <td className="py-2 pr-4">{card.balance_credits ?? 0} kr</td>
                <td className="py-2 pr-4 text-xs text-gray-500">
                  {TICKET_TYPE_LABELS[card.favorite_ticket_type]} {CATEGORY_LABELS[card.favorite_ticket_category]}
                </td>
                <td className="py-2 flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(card)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleBlock.mutate({ id: card.id, status: card.status === 'blocked' ? 'active' : 'blocked' })}>
                    {card.status === 'blocked' ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldOff className="w-4 h-4 text-red-500" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(card.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">Ingen kort funnet</p>}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Rediger TransitKort' : 'Nytt TransitKort'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kortnummer (10 siffer)</Label>
              <div className="flex gap-2">
                <Input value={form.card_number} onChange={e => setForm(f => ({ ...f, card_number: e.target.value }))} maxLength={10} />
                <Button variant="outline" onClick={() => setForm(f => ({ ...f, card_number: generateCardNumber() }))}>Generer</Button>
              </div>
            </div>
            <div>
              <Label>Kundenavn (valgfri)</Label>
              <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Fullt navn" />
            </div>
            <div>
              <Label>Saldo (kr / credits)</Label>
              <Input type="number" value={form.balance_credits} onChange={e => setForm(f => ({ ...f, balance_credits: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Favorittbilletttype</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.favorite_ticket_type} onChange={e => setForm(f => ({ ...f, favorite_ticket_type: e.target.value }))}>
                  {Object.entries(TICKET_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <Label>Kategori</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.favorite_ticket_category} onChange={e => setForm(f => ({ ...f, favorite_ticket_category: e.target.value }))}>
                  <option value="single">Enkeltbillett</option>
                  <option value="period">Periodebillett 30d</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktiv</option>
                <option value="blocked">Sperret</option>
                <option value="expired">Utgått</option>
              </select>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate(form)} disabled={!form.card_number || upsert.isPending}>
              {editing ? 'Lagre endringer' : 'Opprett kort'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}