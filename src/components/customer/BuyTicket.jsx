import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TicketCard from './TicketCard';
import { genShortCode, safeJSON, derivePin } from '@/utils/customerAuth';
import { toast } from 'sonner';
import { Wallet, AlertCircle, Users, Share2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

const TYPES = [
  { type: 'adult', label: 'Adult', icon: '🧑' },
  { type: 'child', label: 'Child', icon: '👶' },
  { type: 'senior', label: 'Senior', icon: '👴' },
  { type: 'student', label: 'Student', icon: '🎓' },
  { type: 'military', label: 'Military', icon: '🪖' },
];

export default function BuyTicket({ customer, onRefresh }) {
  const [selectedType, setSelectedType] = useState('adult');
  const [category, setCategory] = useState('single');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [buyFor, setBuyFor] = useState('self'); // 'self' | phone string
  const [shareModal, setShareModal] = useState(false);
  const [otherPhone, setOtherPhone] = useState('');
  const qc = useQueryClient();

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const cost = priceMap[selectedType]?.[category] || 0;
  const balance = customer.credits || 0;
  const hasEnough = balance >= cost;

  const connected = safeJSON(customer.connected_users, []);

  // Check if selected connected user is enabled and within limit
  const getConnectedUser = (ph) => connected.find(u => (typeof u === 'string' ? u : u.phone) === ph);
  const connectedAllowed = (ph) => {
    const u = getConnectedUser(ph);
    if (!u || typeof u === 'string') return { ok: true };
    if (u.enabled === false) return { ok: false, reason: 'User access is disabled' };
    if (u.credit_limit != null && cost > u.credit_limit) return { ok: false, reason: `Exceeds limit of ${u.credit_limit} credits` };
    if (u.ticket_type && u.ticket_type !== 'any' && u.ticket_type !== selectedType && u.ticket_type !== category) {
      return { ok: false, reason: `Only ${u.ticket_type} tickets allowed` };
    }
    return { ok: true };
  };

  const buyingForConnected = buyFor !== 'self' && buyFor !== 'other';
  const connectedCheck = buyingForConnected ? connectedAllowed(buyFor) : { ok: true };

  const buyMutation = useMutation({
    mutationFn: async () => {
      if (!cost) throw new Error('Price not configured');
      if (!hasEnough) throw new Error('Not enough credits');
      if (buyingForConnected && !connectedCheck.ok) throw new Error(connectedCheck.reason);

      const recipientPhone = buyFor === 'self' ? customer.phone : buyFor === 'other' ? otherPhone.trim() : buyFor;
      const recipientName = buyFor === 'self' ? customer.name : buyFor === 'other' ? (otherPhone.trim() || 'Guest') : (getConnectedUser(buyFor)?.name || buyFor);

      const validUntil = category === 'period' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      const ticket = await base44.entities.Ticket.create({
        type: selectedType, ticket_category: category, credits_paid: cost,
        purchase_method: 'online', status: category === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: buyFor === 'self' ? customer.id : '',
        customer_name: recipientName,
        customer_phone: recipientPhone || ''
      });

      const newCredits = balance - cost;
      const updated = await base44.entities.Customer.update(customer.id, { credits: newCredits });
      await base44.entities.Transaction.create({
        customer_id: customer.id, customer_name: customer.name,
        type: 'purchase', amount: cost,
        description: `${selectedType} ${category} ticket${buyFor !== 'self' ? ` for ${recipientName}` : ''}`,
        performed_by: 'online', ticket_id: ticket.id
      });
      return { ticket, updated };
    },
    onSuccess: ({ ticket, updated }) => {
      qc.invalidateQueries({ queryKey: ['my-tickets', customer.id] });
      onRefresh(updated);
      setPurchasedTicket(ticket);
    },
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

        {/* Share */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-gray-700 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share this ticket</p>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-gray-400">Short Code</p>
              <p className="font-mono font-bold text-gray-800 text-xl tracking-widest">{purchasedTicket.short_code}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copyCode}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
          </div>
          <p className="text-xs text-gray-400 text-center">Recipient can import this code in their app</p>
        </div>

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
          <p className="font-bold text-blue-700">{balance} credits</p>
          <p className="text-xs text-blue-400">Available balance</p>
        </div>
      </div>

      {/* Buy for */}
      {(connected.length > 0) && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> Buying for</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setBuyFor('self')}
              className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all ${buyFor === 'self' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
              🧑 Myself
            </button>
            {connected.map((u, i) => {
              const ph = typeof u === 'string' ? u : u.phone;
              const nm = typeof u === 'object' ? u.name || ph : ph;
              const enabled = typeof u === 'object' ? u.enabled !== false : true;
              return (
                <button key={i} onClick={() => enabled && setBuyFor(ph)} disabled={!enabled}
                  className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all ${!enabled ? 'opacity-40 cursor-not-allowed border-gray-100' : buyFor === ph ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  👤 {nm}
                </button>
              );
            })}
            <button onClick={() => setBuyFor('other')}
              className={`px-3 py-2 border-2 rounded-xl text-xs font-semibold transition-all ${buyFor === 'other' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>
              + Other person
            </button>
          </div>
          {buyFor === 'other' && (
            <Input placeholder="Phone number or name" value={otherPhone} onChange={e => setOtherPhone(e.target.value)} className="mt-2 text-sm" />
          )}
          {buyingForConnected && !connectedCheck.ok && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{connectedCheck.reason}</p>
          )}
        </div>
      )}

      {/* Category */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Ticket Category</p>
        <div className="flex gap-2">
          {[['single', '🎫 Single Ride'], ['period', '📅 30-Day Pass']].map(([v, l]) => (
            <button key={v} onClick={() => setCategory(v)}
              className={`flex-1 py-3 border-2 rounded-xl text-sm font-semibold transition-all ${category === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Passenger Type</p>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => {
            const price = priceMap[t.type]?.[category];
            return (
              <button key={t.type} onClick={() => setSelectedType(t.type)}
                className={`py-3 border-2 rounded-xl flex flex-col items-center gap-1 transition-all ${selectedType === t.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-medium text-gray-700">{t.label}</span>
                <span className="text-xs text-gray-400">{price ? `${price} cr` : '—'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary & Buy */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Price</span>
          <span className="text-2xl font-bold text-gray-900">{cost ? `${cost} credits` : '—'}</span>
        </div>
        {buyFor !== 'self' && buyFor !== 'other' && (
          <p className="text-xs text-blue-600">Credits deducted from your balance</p>
        )}
        {!hasEnough && cost > 0 && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Need {cost - balance} more credits. Top up via Profile.</span>
          </div>
        )}
        <Button
          onClick={() => buyMutation.mutate()}
          disabled={buyMutation.isPending || !cost || !hasEnough || (buyingForConnected && !connectedCheck.ok)}
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">
          {buyMutation.isPending ? 'Processing…' : `🎫 Buy for ${cost} credits`}
        </Button>
      </div>
    </div>
  );
}