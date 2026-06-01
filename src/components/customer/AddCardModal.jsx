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
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  const generate = () => {
    setNumber(formatCardDisplay(generateCardNumber()));
    setName(generateCardholderName());
    setExpiry(generateExpiry());
    setCvv(generateCVV());
    setError('');
  };

  const handleSave = () => {
    const clean = number.replace(/\s/g, '');
    if (!validateLuhn(clean)) { setError('Invalid card number — Luhn check failed'); return; }
    if (!name.trim()) { setError('Cardholder name required'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { setError('Invalid expiry format (MM/YY)'); return; }
    if (!/^\d{3,4}$/.test(cvv)) { setError('Invalid CVV'); return; }
    saveCard({ number: clean, name: name.trim(), expiry, cvv });
    toast.success('Card saved!');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Credit Card</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" className="w-full" onClick={generate}>
            <Wand2 className="w-4 h-4 mr-2" /> Generate Valid Test Card
          </Button>
          <div>
            <Label>Card Number</Label>
            <Input placeholder="1234 5678 9012 3456" value={number}
              onChange={e => { setNumber(e.target.value.replace(/[^\d\s]/g, '')); setError(''); }} />
          </div>
          <div>
            <Label>Cardholder Name</Label>
            <Input placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expiry (MM/YY)</Label>
              <Input placeholder="12/28" value={expiry} onChange={e => setExpiry(e.target.value)} maxLength={5} />
            </div>
            <div>
              <Label>CVV</Label>
              <Input placeholder="123" value={cvv} onChange={e => setCvv(e.target.value)} maxLength={4} />
            </div>
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