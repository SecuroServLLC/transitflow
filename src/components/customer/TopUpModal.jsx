import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getCard, topUp, getAutoCharge, setAutoCharge, getCredits } from '@/utils/creditStore';
import { toast } from 'sonner';
import { CreditCard, Zap } from 'lucide-react';

export default function TopUpModal({ open, onClose }) {
  const card = getCard();
  const [autoCharge, setAutoChargeState] = useState(getAutoCharge());
  const [credits, setCredits] = useState(getCredits());

  const handleTopUp = () => {
    if (!card) { toast.error('Please add a card first'); return; }
    topUp();
    setCredits(getCredits());
    toast.success('625 credits added! (500 + 25% bonus)');
  };

  const toggleAuto = (val) => {
    setAutoChargeState(val);
    setAutoCharge(val);
    toast.success(val ? 'Auto-charge enabled' : 'Auto-charge disabled');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Top Up Credits</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{credits}</p>
            <p className="text-gray-500 text-sm">current balance</p>
          </div>
          <div className="border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">500 credits</span>
              <span className="text-green-600 font-bold">+25% bonus = 625</span>
            </div>
            {card
              ? <div className="flex items-center gap-2 text-sm text-gray-500"><CreditCard className="w-4 h-4" /><span>Charged to •••• {card.number.slice(-4)}</span></div>
              : <p className="text-sm text-red-500">No card saved — add a card first</p>
            }
            <Button onClick={handleTopUp} disabled={!card} className="w-full bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-2" /> Top Up 500 + Bonus
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Auto-charge</Label>
              <p className="text-xs text-gray-500">Auto top-up when credits run low</p>
            </div>
            <Switch checked={autoCharge} onCheckedChange={toggleAuto} />
          </div>
          <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}