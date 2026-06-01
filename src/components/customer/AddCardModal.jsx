import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateLuhn, generateCardNumber, generateCardholderName, generateExpiry, generateCVV, formatCardDisplay } from '@/utils/luhn';
import { saveCard } from '@/utils/creditStore';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';

export default function AddCardModal({ open, onClose }) {
  const [form, setForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [error, setError] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const generate = () => {
    setForm({
      number: formatCardDisplay(generateCardNumber()),
      name: generateCardholderName(),
      expiry: generateExpiry(),
      cvv: generateCVV(),
    });
    setError('');
  };

  const handleSave = () => {
    const clean = form.number.replace(/\s/g, '');
    if (!validateLuhn(clean)) { setError('Invalid card number (fails Luhn check)'); return; }
    if (!form.name.trim()) { setError('Cardholder name required'); return; }
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) { setError('Invalid expiry format (MM/YY)'); return; }
    if (!/^\d{3,4}$/.test(form.cvv)) { setError('Invalid CVV'); return; }
    saveCard({ number: clean, name: form.name.trim(), expiry: form.expiry, cvv: form.cvv });
    toast.success('Card saved!');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Credit Card</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" className="w-full" onClick={generate}>
            <Wand2 className="w-4 h-4 mr-2" /> Generate Valid Card Details
          </Button>
          <div><Label>Card Number</Label><Input placeholder="1234 5678 9012 3456" value={form.number} onChange={e => set('number', e.target.value)} /></div>
          <div><Label>Cardholder Name</Label><Input placeholder="John Smith" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Expiry (MM/YY)</Label><Input placeholder="12/28" value={form.expiry} onChange={e => set('expiry', e.target.value)} maxLength={5} /></div>
            <div><Label>CVV</Label><Input placeholder="123" value={form.cvv} onChange={e => set('cvv', e.target.value)} maxLength={4} /></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">Save Card</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}