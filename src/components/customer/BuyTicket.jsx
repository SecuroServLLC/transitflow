import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TicketCard from './TicketCard';
import LoyaltyLadder from './LoyaltyLadder';
import GroupRide from './GroupRide';
import LiveBusStops from './LiveBusStops';
import AutoBoarding from './AutoBoarding';
import { genShortCode, safeJSON, derivePin } from '@/utils/customerAuth';
import { toast } from 'sonner';
import { Wallet, AlertCircle, Users, Share2, Copy, ChevronDown, ChevronUp, Bus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

const TYPES = [
  { type: 'adult',    label: 'Adult',    icon: '🧑' },
  { type: 'child',    label: 'Child',    icon: '👶' },
  { type: 'senior',   label: 'Senior',   icon: '👴' },
  { type: 'student',  label: 'Student',  icon: '🎓' },
  { type: 'military', label: 'Military', icon: '🪖' },
];

export default function BuyTicket({ customer, onRefresh }) {
  const [selectedType, setSelectedType] = useState('adult');
  const [category, setCategory] = useState('single');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [buyFor, setBuyFor] = useState('self');
  const [otherPhone, setOtherPhone] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const qc = useQueryClient();

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const baseCost = priceMap[selectedType]?.[category] || 0;

  // Loyalty discount
  const { data: myTickets = [] } = useQuery({
    queryKey: ['loyalty', customer.id],
    queryFn: () => base44.entities.Ticket.filter({ customer_id: customer.id }),
    enabled: buyFor === 'self'
  });
  const ownSingles = myTickets.filter(t => t.ticket_category === 'single' && t.purchase_method === 'online');
  const loyaltyCount = ownSingles.length;
  const loyaltyDiscount = buyFor === 'self' ? (loyaltyCount <= 5 ? 5 : Math.min(50, 5 + (loyaltyCount - 5) * 2)) : 0;
  const totalSpent = ownSingles.reduce((s, t) => s + (t.credits_paid || 0), 0);
  const capReached = buyFor === 'self' && totalSpent >= 3000 * 1.2;
  const discountedCost = capReached ? 0 : baseCost > 0 ? Math.round(baseCost * (1 - loyaltyDiscount / 100)) : 0;
  const cost = discountedCost;

  const balance = customer.credits || 0;
  const hasEnough = balance >= cost;
  const connected = safeJSON(customer.connected_users, []);
  const getConnectedUser = (ph) => connected.find(u => (typeof u === 'string' ? u : u.phone) === ph);
  const connectedAllowed = (ph) => {
    const u = getConnectedUser(ph);
    if (!u || typeof u === 'string') return { ok: true };
    if (u.enabled === false) return { ok: false, reason: 'User access is disabled' };
    if (u.credit_limit != null && baseCost > u.credit_limit) return { ok: false, reason: `Exceeds limit of ${u.credit_limit} credits` };
    if (u.ticket_type && u.ticket_type !== 'any' && u.ticket_type !== selectedType && u.ticket_type !== category) return { ok: false, reason: `Only ${u.ticket_type} tickets allowed` };
    return { ok: true };
  };
  const buyingForConnected = buyFor !== 'self' && buyFor !== 'other';
  const connectedCheck = buyingForConnected ? connectedAllowed(buyFor) : { ok: true };

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!baseCost) throw new Error('Price not configured');
      if (!capReached && !hasEnough) throw new Error('Not enough credits');
      if (buyingForConnected && !connectedCheck.ok) throw new Error(connectedCheck.reason);
      const recipientPhone = buyFor === 'self' ? customer.phone : buyFor === 'other' ? otherPhone.trim() : buyFor;
      const recipientName = buyFor === 'self' ? customer.name : buyFor === 'other' ? (otherPhone.trim() || 'Guest') : (getConnectedUser(buyFor)?.name || buyFor);
      const validUntil = category === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      const ticketId = `TT-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const ticket = await base44.entities.Ticket.create({
        ticket_id: ticketId, type: selectedType, ticket_category: category, credits_paid: cost,
        purchase_method: 'online', status: category === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: buyFor === 'self' ? customer.id : '',
        customer_name: recipientName, customer_phone: recipientPhone || ''
      });
      const newCredits = balance - cost;
      const updated = await base44.entities.Customer.update(customer.id, { credits: newCredits });
      await base44.entities.Transaction.create({
        customer_id: customer.id, customer_name: customer.name,
        type: 'purchase', amount: cost,
        description: `${selectedType} ${category} ticket${buyFor !== 'self' ? ` for ${recipientName}` : ''}${loyaltyDiscount > 0 ? ` (${loyaltyDiscount}% loyalty discount)` : ''}`,
        performed_by: 'online', ticket_id: ticketId
      });
      return { ticket, updated };
    },
    onSuccess: ({ ticket, updated }) => { qc.invalidateQueries({ queryKey: ['my-tickets', customer.id] }); onRefresh(updated); setPurchasedTicket(ticket); },
    onError: e => toast.error(e.message)
  });

  const copyCode = () => { navigator.clipboard.writeText(purchasedTicket.short_code); toast.success('Code copied!'); };

  if (purchasedTicket) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-4">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Ticket Ready!</h2>
          <p className="text-gray-500 text-sm">Tap the card to show QR code</p>
        </div>
        <TicketCard ticket={purchasedTicket} />
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-gray-700 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share ticket</p>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-gray-400">Short Code</p>
              <p className="font-mono font-bold text-gray-800 text-xl tracking-widest">{purchasedTicket.short_code}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copyCode}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
          </div>
        </div>
        <Button onClick={() => setPurchasedTicket(null)} variant="outline" className="w-full">Buy Another</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <h2 className="text-xl font-bold text-gray-900">Buy Ticket</h2>

      {/* Loyalty */}
      {buyFor === 'self' && <LoyaltyLadder customer={customer} />}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
        <Wallet className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <p className="font-bold text-blue-700">{balance} credits</p>
          <p className="text-xs text-blue-400">Available balance</p>
        </div>
      </div>

      {/* Buy for */}
      {connected.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> Buying for</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setBuyFor('self')} className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all ${buyFor === 'self' ? 'border-[#c0392b] bg-red-50 text-[#c0392b]' : 'border-gray-200 text-gray-500'}`}>🧑 Myself</button>
            {connected.map((u, i) => {
              const ph = typeof u === 'string' ? u : u.phone;
              const nm = typeof u === 'object' ? u.name || ph : ph;
              const enabled = typeof u === 'object' ? u.enabled !== false : true;
              return <button key={i} onClick={() => enabled && setBuyFor(ph)} disabled={!enabled}
                className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all ${!enabled ? 'opacity-40 cursor-not-allowed border-gray-100' : buyFor === ph ? 'border-[#c0392b] bg-red-50 text-[#c0392b]' : 'border-gray-200 text-gray-500'}`}>👤 {nm}</button>;
            })}
            <button onClick={() => setBuyFor('other')} className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all ${buyFor === 'other' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>+ Other</button>
          </div>
          {buyFor === 'other' && <Input placeholder="Phone or name" value={otherPhone} onChange={e => setOtherPhone(e.target.value)} className="mt-2 text-sm" />}
          {buyingForConnected && !connectedCheck.ok && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{connectedCheck.reason}</p>}
        </div>
      )}

      {/* Category */}
      <div className="flex gap-2">
        {[['single', '🎫 Single'], ['period', '📅 30-Day Pass']].map(([v, l]) => (
          <button key={v} onClick={() => setCategory(v)}
            className={`flex-1 py-3 border-2 rounded-xl text-sm font-semibold transition-all ${category === v ? 'border-[#c0392b] bg-red-50 text-[#c0392b]' : 'border-gray-200 text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {/* Type grid */}
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map(t => {
          const price = priceMap[t.type]?.[category];
          return (
            <button key={t.type} onClick={() => setSelectedType(t.type)}
              className={`py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${selectedType === t.type ? 'border-[#c0392b] bg-red-50' : 'border-gray-200'}`}>
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-medium text-gray-700">{t.label}</span>
              <span className="text-xs text-gray-400">{price ? `${price} cr` : '—'}</span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        {baseCost > 0 && loyaltyDiscount > 0 && !capReached && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Base price</span><span className="line-through text-gray-400">{baseCost} cr</span>
          </div>
        )}
        {loyaltyDiscount > 0 && !capReached && <div className="flex justify-between text-xs"><span className="text-amber-600 font-semibold">Loyalty {loyaltyDiscount}% off</span><span className="text-amber-600 font-semibold">−{baseCost - cost} cr</span></div>}
        {capReached && <div className="flex justify-between text-xs"><span className="text-green-600 font-bold">🎉 Monthly cap reached!</span><span className="text-green-600 font-bold">FREE</span></div>}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total</span>
          <span className="text-2xl font-bold text-gray-900">{capReached ? 'FREE' : cost ? `${cost} credits` : '—'}</span>
        </div>
        {!hasEnough && cost > 0 && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" /><span>Need {cost - balance} more credits</span></div>}
        <Button onClick={() => buyMutation.mutate()} disabled={buyMutation.isPending || (!capReached && (!cost || !hasEnough)) || (buyingForConnected && !connectedCheck.ok)} className="w-full h-12 text-base bg-[#c0392b] hover:bg-[#a93226]">
          {buyMutation.isPending ? 'Processing…' : `🎫 Buy ${capReached ? '(Free!)' : `for ${cost} credits`}`}
        </Button>
      </div>

      {/* Extras Toggle */}
      <button onClick={() => setShowExtras(!showExtras)} className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 py-2 border-t border-gray-100">
        <span className="flex items-center gap-1.5"><Bus className="w-4 h-4" /> Live Stops, Auto-Boarding & Group Rides</span>
        {showExtras ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showExtras && (
        <div className="space-y-4">
          <AutoBoarding customer={customer} onRefresh={onRefresh} />
          <GroupRide customer={customer} onRefresh={onRefresh} />
          <LiveBusStops />
        </div>
      )}
    </div>
  );
}