import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TicketTypeCard from '@/components/customer/TicketTypeCard';
import AddCardModal from '@/components/customer/AddCardModal';
import TopUpModal from '@/components/customer/TopUpModal';
import QRDisplay from '@/components/customer/QRDisplay';
import { getCredits, getCard, deductCredits, getAutoCharge, topUp } from '@/utils/creditStore';
import { Button } from '@/components/ui/button';
import { CreditCard, Wallet, Zap } from 'lucide-react';
import { toast } from 'sonner';

const TICKET_TYPES = [
  { type: 'adult',    label: 'Adult',    icon: '🧑' },
  { type: 'child',    label: 'Child',    icon: '👶' },
  { type: 'senior',   label: 'Senior',   icon: '👴' },
  { type: 'student',  label: 'Student',  icon: '🎓' },
  { type: 'military', label: 'Military', icon: '🪖' },
];

function genShortCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CustomerSite() {
  const [credits, setCreditsState] = useState(getCredits());
  const [card, setCardState] = useState(getCard());
  const [showAddCard, setShowAddCard] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const qc = useQueryClient();

  const refreshWallet = () => { setCreditsState(getCredits()); setCardState(getCard()); };

  const { data: pricingData = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricingData.forEach(p => { priceMap[p.ticket_type] = p.credit_cost; });

  const createTicket = useMutation({
    mutationFn: d => base44.entities.Ticket.create(d),
    onSuccess: ticket => {
      deductCredits(ticket.credits_paid);
      refreshWallet();
      setPurchasedTicket(ticket);
      qc.invalidateQueries({ queryKey: ['tickets'] });
    }
  });

  const buyTicket = (type) => {
    const cost = priceMap[type];
    if (!cost) return toast.error('Pricing not set for this ticket type');
    let cur = getCredits();
    if (cur < cost) {
      if (getAutoCharge() && getCard()) {
        topUp(); refreshWallet(); cur = getCredits();
        toast.success('Auto-charged 625 credits!');
      } else {
        toast.error(`Need ${cost} credits, you have ${cur}. Please top up.`);
        setShowTopUp(true); return;
      }
    }
    if (cur < cost) { toast.error('Insufficient credits even after top-up.'); return; }
    createTicket.mutate({
      type, credits_paid: cost, purchase_method: 'online',
      status: 'unused', qr_token: crypto.randomUUID(),
      short_code: genShortCode(), purchased_at: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-blue-600">🚌 TransitTicket</h1>
            <p className="text-xs text-gray-500">Your journey starts here</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-700">{credits} credits</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTopUp(true)}>
              <Zap className="w-4 h-4 mr-1" />Top Up
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)}>
              <CreditCard className="w-4 h-4 mr-1" />
              {card ? `•••• ${card.number.slice(-4)}` : 'Add Card'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {purchasedTicket ? (
          <QRDisplay ticket={purchasedTicket} onDone={() => setPurchasedTicket(null)} />
        ) : (
          <>
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-gray-900">Buy a Ticket</h2>
              <p className="text-gray-500 mt-2 text-lg">Select your fare type</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {TICKET_TYPES.map(t => (
                <TicketTypeCard key={t.type} type={t.type} label={t.label} icon={t.icon}
                  cost={priceMap[t.type]} hasCredits={credits >= (priceMap[t.type] || 0)}
                  onBuy={() => buyTicket(t.type)} loading={createTicket.isPending} />
              ))}
            </div>
            {!card && (
              <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                <p className="text-blue-700 font-semibold text-lg">No card saved yet</p>
                <p className="text-blue-500 text-sm mt-1">Add a card to top up your credit wallet</p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAddCard(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />Add Card
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <AddCardModal open={showAddCard} onClose={() => { setShowAddCard(false); refreshWallet(); }} />
      <TopUpModal open={showTopUp} onClose={() => { setShowTopUp(false); refreshWallet(); }} />
    </div>
  );
}