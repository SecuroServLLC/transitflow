import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import TicketCard from './TicketCard';
import { genShortCode } from '@/utils/customerAuth';
import { toast } from 'sonner';
import { Wallet, AlertCircle } from 'lucide-react';

const TYPES = [
  { type:'adult',    label:'Adult',    icon:'🧑' },
  { type:'child',    label:'Child',    icon:'👶' },
  { type:'senior',   label:'Senior',   icon:'👴' },
  { type:'student',  label:'Student',  icon:'🎓' },
  { type:'military', label:'Military', icon:'🪖' },
];

export default function BuyTicket({ customer, onRefresh }) {
  const [selectedType, setSelectedType] = useState('adult');
  const [category, setCategory] = useState('single');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const qc = useQueryClient();

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const cost = priceMap[selectedType]?.[category] || 0;
  const hasEnough = (customer.credits || 0) >= cost;

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!cost) throw new Error('Price not set for this ticket type');
      if (!hasEnough) throw new Error('Not enough credits');
      const now = new Date().toISOString();
      const validUntil = category === 'period' ? new Date(Date.now() + 30*24*60*60*1000).toISOString() : null;
      const ticket = await base44.entities.Ticket.create({
        type: selectedType, ticket_category: category, credits_paid: cost,
        purchase_method: 'online', status: category === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: now, valid_until: validUntil,
        customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone || ''
      });
      const newCredits = (customer.credits || 0) - cost;
      const updated = await base44.entities.Customer.update(customer.id, { credits: newCredits });
      await base44.entities.Transaction.create({
        customer_id: customer.id, customer_name: customer.name,
        type: 'purchase', amount: cost, description: `${selectedType} ${category} ticket`,
        performed_by: 'online', ticket_id: ticket.id
      });
      return { ticket, updated };
    },
    onSuccess: ({ ticket, updated }) => {
      qc.invalidateQueries({ queryKey: ['my-tickets', customer.id] });
      onRefresh(updated);
      setPurchasedTicket(ticket);
    },
    onError: (e) => toast.error(e.message)
  });

  if (purchasedTicket) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-4">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Ticket Ready!</h2>
          <p className="text-gray-500 text-sm">Tap the card below to show QR</p>
        </div>
        <TicketCard ticket={purchasedTicket} />
        <Button onClick={() => setPurchasedTicket(null)} variant="outline" className="w-full">Buy Another</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Buy Ticket</h2>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
        <Wallet className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <p className="font-bold text-blue-700">{customer.credits || 0} credits</p>
          <p className="text-xs text-blue-400">Available balance</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Ticket Category</p>
        <div className="flex gap-2">
          {[['single','🎫 Single Ride'],['period','📅 30-Day Pass']].map(([v,l]) => (
            <button key={v} onClick={() => setCategory(v)}
              className={`flex-1 py-3 border-2 rounded-xl text-sm font-semibold transition-all ${
                category === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Passenger Type</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => {
            const price = priceMap[t.type]?.[category];
            return (
              <button key={t.type} onClick={() => setSelectedType(t.type)}
                className={`py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  selectedType === t.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-medium text-gray-700">{t.label}</span>
                <span className="text-xs text-gray-400">{price ? `${price} cr` : '—'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Price</span>
          <span className="text-2xl font-bold text-gray-900">{cost ? `${cost} credits` : 'Not configured'}</span>
        </div>
        {!hasEnough && cost > 0 && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Need {cost - (customer.credits||0)} more credits. Top up at a cashier, machine, or via your profile.</span>
          </div>
        )}
        <Button
          onClick={() => buyMutation.mutate()}
          disabled={buyMutation.isPending || !cost || !hasEnough}
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">
          {buyMutation.isPending ? 'Processing…' : `🎫 Buy for ${cost} credits`}
        </Button>
      </div>
    </div>
  );
}