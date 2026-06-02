import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { validateLuhn, generateCardNumber, generateCardholderName, generateExpiry, generateCVV, formatCardDisplay } from '@/utils/luhn';
import { derivePin, safeJSON } from '@/utils/customerAuth';
import { LogOut, CreditCard, Car, Users, Plus, Trash2, Wand2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerProfile({ customer, onRefresh, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: customer.name, email: customer.email||'', phone: customer.phone||'' });
  const [modal, setModal] = useState(null);
  const [cardForm, setCardForm] = useState({ number:'', name:'', expiry:'', cvv:'' });
  const [vehicleForm, setVehicleForm] = useState({ plate:'', description:'' });
  const [connectedPhone, setConnectedPhone] = useState('');

  const cards = safeJSON(customer.credit_cards, []);
  const vehicles = safeJSON(customer.vehicles, []);
  const connected = safeJSON(customer.connected_users, []);
  const pin = derivePin(customer.phone || '');

  const upd = useMutation({
    mutationFn: data => base44.entities.Customer.update(customer.id, data),
    onSuccess: onRefresh
  });

  const saveProfile = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    upd.mutate({ name: form.name, email: form.email, phone: form.phone }, { onSuccess: () => { toast.success('Saved!'); setEditing(false); } });
  };

  const genCard = () => setCardForm({ number: formatCardDisplay(generateCardNumber()), name: generateCardholderName(), expiry: generateExpiry(), cvv: generateCVV() });

  const saveCard = () => {
    const clean = cardForm.number.replace(/\s/g,'');
    if (!validateLuhn(clean)) { toast.error('Invalid card number'); return; }
    if (!cardForm.name || !cardForm.expiry || !cardForm.cvv) { toast.error('Fill all fields'); return; }
    upd.mutate({ credit_cards: JSON.stringify([...cards, { number: clean, name: cardForm.name, expiry: cardForm.expiry }]) }, { onSuccess: () => { toast.success('Card saved!'); setModal(null); } });
  };

  const removeCard = i => upd.mutate({ credit_cards: JSON.stringify(cards.filter((_,j)=>j!==i)) }, { onSuccess: () => toast.success('Removed') });
  const saveVehicle = () => {
    if (!vehicleForm.plate) { toast.error('Plate required'); return; }
    upd.mutate({ vehicles: JSON.stringify([...vehicles, vehicleForm]) }, { onSuccess: () => { toast.success('Added!'); setModal(null); setVehicleForm({plate:'',description:''}); } });
  };
  const removeVehicle = i => upd.mutate({ vehicles: JSON.stringify(vehicles.filter((_,j)=>j!==i)) });
  const addUser = () => {
    if (!connectedPhone.trim()) return;
    upd.mutate({ connected_users: JSON.stringify([...connected, connectedPhone.trim()]) }, { onSuccess: () => { toast.success('Added!'); setModal(null); setConnectedPhone(''); } });
  };
  const removeUser = i => upd.mutate({ connected_users: JSON.stringify(connected.filter((_,j)=>j!==i)) });

  const doTopUp = () => {
    if (cards.length === 0) { toast.error('Add a card first'); return; }
    const bonus = Math.round(500 * 0.25);
    upd.mutate({ credits: (customer.credits||0) + 500 + bonus }, { onSuccess: () => { toast.success(`625 credits added! (+${bonus} bonus)`); setModal(null); } });
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-red-400 hover:text-red-600">
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </div>

      {/* Credits card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-200 text-sm">Credit Balance</p>
            <p className="text-5xl font-black mt-1">{customer.credits||0}</p>
            <p className="text-blue-200 text-sm">credits</p>
            {pin && <p className="text-blue-300 text-xs mt-3">Login PIN: <span className="font-mono font-bold text-white">{pin}</span></p>}
          </div>
          <Button onClick={() => setModal('topup')} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
            <Zap className="w-4 h-4 mr-1" /> Top Up
          </Button>
        </div>
      </div>

      {/* Personal Info */}
      <Section title="Personal Info" action={editing ? <button onClick={saveProfile} className="text-blue-600 text-sm font-semibold">Save</button> : <button onClick={() => setEditing(true)} className="text-blue-600 text-sm">Edit</button>}>
        {editing ? (
          <div className="p-4 space-y-3">
            <div><Label className="text-xs text-gray-500">Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><Label className="text-xs text-gray-500">Email</Label><Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><Label className="text-xs text-gray-500">Phone</Label><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            <p className="font-semibold text-gray-900">{customer.name}</p>
            <p className="text-gray-500 text-sm">{customer.email||'No email'}</p>
            <p className="text-gray-500 text-sm">{customer.phone||'No phone'}</p>
          </div>
        )}
      </Section>

      {/* Credit Cards */}
      <Section title="Credit Cards" icon={<CreditCard className="w-4 h-4" />}
        action={<button onClick={() => { setCardForm({number:'',name:'',expiry:'',cvv:''}); setModal('card'); }} className="text-blue-600"><Plus className="w-5 h-5" /></button>}>
        {cards.length === 0 && <p className="p-4 text-gray-400 text-sm text-center">No cards added</p>}
        {cards.map((c,i) => (
          <div key={i} className="p-4 flex justify-between items-center border-t border-gray-100">
            <div>
              <p className="font-mono text-gray-800">•••• {c.number.slice(-4)}</p>
              <p className="text-xs text-gray-400">{c.name} · {c.expiry}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeCard(i)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
          </div>
        ))}
      </Section>

      {/* Vehicles */}
      <Section title="Vehicles" icon={<Car className="w-4 h-4" />}
        action={<button onClick={() => { setVehicleForm({plate:'',description:''}); setModal('vehicle'); }} className="text-blue-600"><Plus className="w-5 h-5" /></button>}>
        {vehicles.length === 0 && <p className="p-4 text-gray-400 text-sm text-center">No vehicles added</p>}
        {vehicles.map((v,i) => (
          <div key={i} className="p-4 flex justify-between items-center border-t border-gray-100">
            <div>
              <p className="font-bold text-gray-900 uppercase">{v.plate}</p>
              <p className="text-xs text-gray-400">{v.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeVehicle(i)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
          </div>
        ))}
      </Section>

      {/* Connected Users */}
      <Section title="Connected Users" icon={<Users className="w-4 h-4" />}
        action={<button onClick={() => { setConnectedPhone(''); setModal('user'); }} className="text-blue-600"><Plus className="w-5 h-5" /></button>}>
        {connected.length === 0 && <p className="p-4 text-gray-400 text-sm text-center">No connected users</p>}
        {connected.map((ph,i) => (
          <div key={i} className="p-4 flex justify-between items-center border-t border-gray-100">
            <div>
              <p className="text-gray-800">{ph}</p>
              <p className="text-xs text-gray-400">PIN: <span className="font-mono">{derivePin(ph)}</span></p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeUser(i)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
          </div>
        ))}
      </Section>

      {/* Modals */}
      <Dialog open={modal==='topup'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Top Up Credits</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{customer.credits||0}</p>
              <p className="text-blue-400 text-sm">current balance</p>
            </div>
            <div className="border rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm"><span>500 credits</span><span className="text-green-600 font-bold">+25% bonus = 625 total</span></div>
              {cards.length>0 ? <p className="text-xs text-gray-400">Charged to •••• {cards[0].number.slice(-4)}</p> : <p className="text-xs text-red-500">Add a card first</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={doTopUp} disabled={cards.length===0} className="flex-1 bg-blue-600 hover:bg-blue-700"><Zap className="w-4 h-4 mr-2" />Top Up</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal==='card'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Credit Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={genCard}><Wand2 className="w-4 h-4 mr-2" /> Generate Test Card</Button>
            <div><Label>Card Number</Label><Input placeholder="1234 5678 9012 3456" value={cardForm.number} onChange={e=>setCardForm(f=>({...f,number:e.target.value}))} /></div>
            <div><Label>Name</Label><Input placeholder="John Smith" value={cardForm.name} onChange={e=>setCardForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Expiry</Label><Input placeholder="MM/YY" value={cardForm.expiry} onChange={e=>setCardForm(f=>({...f,expiry:e.target.value}))} /></div>
              <div><Label>CVV</Label><Input placeholder="123" value={cardForm.cvv} onChange={e=>setCardForm(f=>({...f,cvv:e.target.value}))} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveCard} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal==='vehicle'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>License Plate *</Label><Input placeholder="AB 12345" value={vehicleForm.plate} onChange={e=>setVehicleForm(f=>({...f,plate:e.target.value}))} /></div>
            <div><Label>Description</Label><Input placeholder="Blue Toyota Corolla" value={vehicleForm.description} onChange={e=>setVehicleForm(f=>({...f,description:e.target.value}))} /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveVehicle} className="flex-1 bg-blue-600 hover:bg-blue-700">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal==='user'} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Connected User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Phone Number</Label>
              <Input placeholder="41272343" value={connectedPhone} onChange={e=>setConnectedPhone(e.target.value)} />
              {connectedPhone && <p className="text-xs text-blue-500 mt-1">PIN: <span className="font-mono font-bold">{derivePin(connectedPhone)}</span></p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={addUser} className="flex-1 bg-blue-600 hover:bg-blue-700">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, icon, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">{icon}{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}