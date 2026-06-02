import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CustomerAuth from '@/components/customer/CustomerAuth';
import TicketCard from '@/components/customer/TicketCard';
import CustomerProfile from '@/components/customer/CustomerProfile';
import { getCustomerSession, setCustomerSession, clearCustomerSession, safeJSON, genShortCode } from '@/utils/customerAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Wallet, ShoppingBag, Ticket, User, AlertCircle } from 'lucide-react';

const TYPES = [
  { type:'adult',    label:'Adult',    icon:'🧑', desc:'Standard fare' },
  { type:'child',    label:'Child',    icon:'👶', desc:'Ages 5–15' },
  { type:'senior',   label:'Senior',   icon:'👴', desc:'65 and over' },
  { type:'student',  label:'Student',  icon:'🎓', desc:'Valid student ID' },
  { type:'military', label:'Military', icon:'🪖', desc:'Military personnel' },
];

export default function CustomerWeb() {
  const [customer, setCustomer] = useState(getCustomerSession());
  const [section, setSection] = useState('buy');
  const [category, setCategory] = useState('single');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const qc = useQueryClient();

  const refreshCustomer = async (upd) => {
    const updated = { ...customer, ...(upd || {}) };
    setCustomerSession(updated);
    setCustomer(updated);
  };

  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const { data: myTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['web-tickets', customer?.id],
    queryFn: () => base44.entities.Ticket.filter({ customer_id: customer.id }, '-purchased_at', 100),
    enabled: !!customer
  });

  const priceMap = {};
  pricing.forEach(p => { priceMap[p.ticket_type] = { single: p.credit_cost, period: p.period_credit_cost }; });

  const buyMutation = useMutation({
    mutationFn: async ({ type, cat }) => {
      const cost = priceMap[type]?.[cat];
      if (!cost) throw new Error('Price not configured');
      if ((customer.credits||0) < cost) throw new Error('Insufficient credits. Top up via your profile.');
      const validUntil = cat === 'period' ? new Date(Date.now() + 30*24*60*60*1000).toISOString() : null;
      const ticket = await base44.entities.Ticket.create({
        type, ticket_category: cat, credits_paid: cost,
        purchase_method: 'online', status: cat === 'period' ? 'active' : 'unused',
        qr_token: crypto.randomUUID(), short_code: genShortCode(),
        purchased_at: new Date().toISOString(), valid_until: validUntil,
        customer_id: customer.id, customer_name: customer.name
      });
      const newCredits = (customer.credits||0) - cost;
      const updated = await base44.entities.Customer.update(customer.id, { credits: newCredits });
      await base44.entities.Transaction.create({ customer_id: customer.id, customer_name: customer.name, type: 'purchase', amount: cost, description: `${type} ${cat} ticket`, performed_by: 'web' });
      return { ticket, updated };
    },
    onSuccess: ({ ticket, updated }) => {
      qc.invalidateQueries({ queryKey: ['web-tickets', customer.id] });
      refreshCustomer(updated);
      setPurchasedTicket(ticket);
    },
    onError: e => toast.error(e.message)
  });

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3"><span className="text-3xl">🚌</span><div><h1 className="text-xl font-bold text-gray-900">TransitTicket</h1><p className="text-xs text-gray-400">Smart public transport</p></div></div>
        </header>
        <div className="max-w-md mx-auto mt-12 px-4"><CustomerAuth onLogin={c => { setCustomerSession(c); setCustomer(c); }} /></div>
      </div>
    );
  }

  const cards = safeJSON(customer.credit_cards, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚌</span>
            <div><h1 className="text-xl font-bold text-gray-900">TransitTicket</h1><p className="text-xs text-gray-400">Welcome, {customer.name}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-700">{customer.credits||0} credits</span>
            </div>
            {[['buy','Buy Tickets',ShoppingBag],['tickets','My Tickets',Ticket],['profile','Profile',User]].map(([id,label,Icon]) => (
              <button key={id} onClick={() => setSection(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  section === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {section === 'buy' && (
          <>
            {purchasedTicket ? (
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-2">✅</div>
                  <h2 className="text-2xl font-bold">Ticket Purchased!</h2>
                  <p className="text-gray-500">Click the ticket to show QR code</p>
                </div>
                <TicketCard ticket={purchasedTicket} />
                <Button onClick={() => setPurchasedTicket(null)} variant="outline" className="w-full mt-4">Buy Another</Button>
              </div>
            ) : (
              <div>
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-gray-900">Buy a Ticket</h2>
                  <p className="text-gray-500 mt-2">Secure online purchase with credits</p>
                </div>

                <div className="flex justify-center gap-4 mb-8">
                  {[['single','🎫 Single Ticket'],['period','📅 30-Day Period Pass']].map(([v,l]) => (
                    <button key={v} onClick={() => setCategory(v)}
                      className={`px-6 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        category === v ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}>{l}</button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {TYPES.map(t => {
                    const cost = priceMap[t.type]?.[category];
                    const canAfford = (customer.credits||0) >= (cost||0);
                    return (
                      <div key={t.type} className="bg-white rounded-2xl border-2 border-gray-100 p-6 flex flex-col items-center gap-3 hover:shadow-lg transition-all hover:border-blue-100">
                        <span className="text-5xl">{t.icon}</span>
                        <div className="text-center">
                          <p className="font-bold text-gray-900">{t.label}</p>
                          <p className="text-xs text-gray-400">{t.desc}</p>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${canAfford && cost ? 'bg-blue-100 text-blue-700' : cost ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                          {cost ? `${cost} credits` : 'Not set'}
                        </div>
                        {!canAfford && cost > 0 && <p className="text-xs text-red-400 text-center"><AlertCircle className="w-3 h-3 inline mr-1" />Insufficient</p>}
                        <Button
                          onClick={() => buyMutation.mutate({ type: t.type, cat: category })}
                          disabled={buyMutation.isPending || !cost || !canAfford}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white">Buy</Button>
                      </div>
                    );
                  })}
                </div>

                {(customer.credits||0) === 0 && (
                  <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                    <p className="font-semibold text-amber-800">No credits?</p>
                    <p className="text-amber-600 text-sm mt-1">
                      {cards.length > 0 ? 'Top up via your Profile.' : 'Add a card in your Profile, then top up. Or visit a cashier / ticket machine.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {section === 'tickets' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Tickets</h2>
            {ticketsLoading ? <p className="text-center text-gray-400 py-16">Loading…</p> : (
              myTickets.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <div className="text-7xl mb-4">🎫</div>
                  <p className="font-semibold text-xl text-gray-500">No tickets yet</p>
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setSection('buy')}>Buy Your First Ticket</Button>
                </div>
              ) : (
                <div className="space-y-3">{myTickets.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
              )
            )}
          </div>
        )}

        {section === 'profile' && (
          <div className="max-w-lg mx-auto">
            <CustomerProfile customer={customer} onRefresh={refreshCustomer} onLogout={() => { clearCustomerSession(); setCustomer(null); }} />
          </div>
        )}
      </main>
    </div>
  );
}