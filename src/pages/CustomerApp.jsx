import { useState } from 'react';
import UnifiedLogin from '@/pages/UnifiedLogin';
import MyTickets from '@/components/customer/MyTickets';
import BuyTicket from '@/components/customer/BuyTicket';
import CustomerProfile from '@/components/customer/CustomerProfile';
import PenaltyAlerts from '@/components/customer/PenaltyAlerts';
import { getCustomerSession, setCustomerSession, clearCustomerSession } from '@/utils/customerAuth';
import { base44 } from '@/api/base44Client';
import { Ticket, ShoppingBag, User } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';

export default function CustomerApp() {
  const [customer, setCustomer] = useState(getCustomerSession());
  const [tab, setTab] = useState('buy');

  const handleLogin = (c) => { setCustomerSession(c); setCustomer(c); setTab('buy'); };
  const handleLogout = () => { clearCustomerSession(); setCustomer(null); };

  const refreshCustomer = async (updatedOrObj) => {
    const list = await base44.entities.Customer.filter({ id: customer.id });
    const fresh = list[0] || updatedOrObj || customer;
    setCustomerSession(fresh);
    setCustomer(fresh);
  };

  if (!customer) return <UnifiedLogin onPassengerAuth={handleLogin} />;

  const TABS = [
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'buy',     label: 'Buy',     icon: ShoppingBag },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-2xl">
      {/* LST Header */}
      <header className="bg-[#0a0a0a] text-white px-5 py-3 sticky top-0 z-10 border-b-2 border-[#c0392b]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LSTLogo size={36} />
            <div>
              <p className="font-black text-white text-xs leading-none tracking-wider">LOS SANTOS</p>
              <p className="font-black text-[#c0392b] text-[10px] leading-none tracking-widest">TRANSIT</p>
            </div>
          </div>
          <div className="bg-[#c0392b]/20 border border-[#c0392b]/40 rounded-lg px-3 py-1.5">
            <span className="font-black text-white text-sm">{customer.credits || 0}</span>
            <span className="text-[#e74c3c] text-xs ml-1">credits</span>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-1">{customer.name}</p>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Penalty alerts shown on any tab */}
        <div className="px-4 pt-4">
          <PenaltyAlerts customer={customer} onRefresh={refreshCustomer} />
        </div>
        {tab === 'tickets' && <MyTickets customer={customer} />}
        {tab === 'buy' && <BuyTicket customer={customer} onRefresh={refreshCustomer} />}
        {tab === 'profile' && <CustomerProfile customer={customer} onRefresh={refreshCustomer} onLogout={handleLogout} />}
      </main>

      {/* LST Bottom Nav */}
      <nav className="bg-[#0a0a0a] border-t border-[#c0392b]/30 sticky bottom-0 z-10">
        <div className="flex">
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors ${tab === id ? 'text-[#c0392b] border-t-2 border-[#c0392b] -mt-px' : 'text-slate-500 hover:text-slate-300'}`}>
              <TabIcon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}