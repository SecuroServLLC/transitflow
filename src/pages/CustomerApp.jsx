import { useState } from 'react';
import CustomerAuth from '@/components/customer/CustomerAuth';
import MyTickets from '@/components/customer/MyTickets';
import BuyTicket from '@/components/customer/BuyTicket';
import CustomerProfile from '@/components/customer/CustomerProfile';
import { getCustomerSession, setCustomerSession, clearCustomerSession } from '@/utils/customerAuth';
import { base44 } from '@/api/base44Client';
import { Ticket, ShoppingBag, User } from 'lucide-react';

export default function CustomerApp() {
  const [customer, setCustomer] = useState(getCustomerSession());
  const [tab, setTab] = useState('buy');

  const handleLogin = (c) => { setCustomerSession(c); setCustomer(c); setTab('buy'); };
  const handleLogout = () => { clearCustomerSession(); setCustomer(null); };

  const refreshCustomer = async (updatedOrObj) => {
    // Always reload full record from DB to get all fields (cards, connected_users, etc.)
    const list = await base44.entities.Customer.filter({ id: customer.id });
    const fresh = list[0] || updatedOrObj || customer;
    setCustomerSession(fresh);
    setCustomer(fresh);
  };

  if (!customer) return <CustomerAuth onLogin={handleLogin} />;

  const TABS = [
    { id: 'tickets', label: 'My Tickets', icon: Ticket },
    { id: 'buy',     label: 'Buy',        icon: ShoppingBag },
    { id: 'profile', label: 'Profile',    icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      <header className="bg-blue-600 text-white px-5 py-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">🚌 TransitTicket</h1>
            <p className="text-blue-200 text-xs">{customer.name}</p>
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1.5">
            <span className="font-bold text-sm">{customer.credits || 0}</span>
            <span className="text-blue-200 text-xs ml-1">credits</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {tab === 'tickets' && <MyTickets customer={customer} />}
        {tab === 'buy' && <BuyTicket customer={customer} onRefresh={refreshCustomer} />}
        {tab === 'profile' && <CustomerProfile customer={customer} onRefresh={refreshCustomer} onLogout={handleLogout} />}
      </main>

      <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-10">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
                tab === id ? 'text-blue-600 border-t-2 border-blue-600 -mt-px' : 'text-gray-400'
              }`}>
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}