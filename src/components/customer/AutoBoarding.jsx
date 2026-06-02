import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Bus, Zap, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { genShortCode } from '@/utils/customerAuth';

export default function AutoBoarding({ customer, onRefresh }) {
  const [active, setActive] = useState(false);
  const [proximity, setProximity] = useState(200);
  const [triggered, setTriggered] = useState(false);
  const intervalRef = useRef(null);
  const qc = useQueryClient();

  const buyTicket = useMutation({
    mutationFn: async () => {
      if ((customer.credits || 0) < 100) throw new Error('Insufficient credits for auto-boarding');
      const ticket = await base44.entities.Ticket.create({
        type: 'adult', ticket_category: 'single', credits_paid: 100,
        purchase_method: 'online', status: 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(),
        customer_id: customer.id, customer_name: customer.name,
        notes: 'AUTO-BOARDING via GPS proximity detection'
      });
      const updated = await base44.entities.Customer.update(customer.id, { credits: customer.credits - 100 });
      return { ticket, updated };
    },
    onSuccess: ({ updated }) => { onRefresh(updated); qc.invalidateQueries({ queryKey: ['my-tickets', customer.id] }); }
  });

  useEffect(() => {
    if (!active || triggered) return;
    intervalRef.current = setInterval(() => {
      setProximity(prev => {
        const next = Math.max(10, prev - Math.floor(Math.random() * 25 + 10));
        if (next < 100 && prev >= 100) {
          setTriggered(true);
          toast.success('🚌 Auto-Boarding Triggered!', { description: 'Bus detected within 100m. Ticket purchased.' });
          buyTicket.mutate();
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [active, triggered]);

  const toggle = (v) => { setActive(v); if (v) { setProximity(200); setTriggered(false); } else clearInterval(intervalRef.current); };

  return (
    <div className={`rounded-2xl p-4 border transition-all ${active ? 'bg-indigo-950/30 border-indigo-700/30' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bus className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-gray-400'}`} />
          <div>
            <p className="font-bold text-sm">Smart Auto-Boarding</p>
            <p className="text-xs text-gray-400">Auto-buy when bus is within 100m</p>
          </div>
        </div>
        <Switch checked={active} onCheckedChange={toggle} />
      </div>
      {active && (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1 text-indigo-300"><MapPin className="w-3 h-3" /> Bus proximity</span>
            <span className={`font-bold font-mono ${proximity < 100 ? 'text-green-400' : 'text-indigo-300'}`}>{proximity}m</span>
          </div>
          <div className="w-full bg-indigo-950/60 h-2 rounded-full overflow-hidden">
            <div className={`h-full transition-all rounded-full ${proximity < 100 ? 'bg-green-400' : 'bg-indigo-500'}`} style={{ width: `${Math.max(0, 100 - proximity / 2)}%` }} />
          </div>
          {triggered ? (
            <p className="text-xs text-green-400 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Ticket purchased automatically!</p>
          ) : (
            <p className="text-[10px] text-indigo-400/60 animate-pulse">{proximity < 100 ? 'Boarding...' : `Approaching... (demo simulation)`}</p>
          )}
        </div>
      )}
    </div>
  );
}