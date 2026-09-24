import { useState, useEffect } from 'react';
import UnifiedLogin from '@/pages/UnifiedLogin';
import MyTickets from '@/components/customer/MyTickets';
import BuyTicket from '@/components/customer/BuyTicket';
import CustomerProfile from '@/components/customer/CustomerProfile';
import TransitCardPanel from '@/components/customer/TransitCardPanel';
import PenaltyAlerts from '@/components/customer/PenaltyAlerts';
import { getCustomerSession, setCustomerSession, clearCustomerSession, validatePin } from '@/utils/customerAuth';
import { isUnlocked, setUnlocked, clearRemember, clearUnlocked } from '@/utils/sessionLock';
import QuickUnlock from '@/components/QuickUnlock';
import { base44 } from '@/api/base44Client';
import { Ticket, ShoppingBag, User, CreditCard } from 'lucide-react';
import LSTLogo from '@/components/LSTLogo';

// Detects mobile by user-agent (primary) and window width (fallback for resize/desktop narrow).
function useIsMobile() {
  const get = () => {
    if (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  };
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

const TABS = [
  { id: 'tickets', label: 'Billetter', icon: Ticket },
  { id: 'buy',     label: 'Kjøp',     icon: ShoppingBag },
  { id: 'profile', label: 'Profil',  icon: User },
];

export default function CustomerPortal() {
  const [customer, setCustomer] = useState(getCustomerSession());
  const [tab, setTab] = useState('buy');
  const isMobile = useIsMobile();

  const handleLogin = (c) => { setCustomerSession(c); setCustomer(c); setTab('buy'); setUnlocked(); };
  const handleLogout = () => { clearCustomerSession(); setCustomer(null); };

  const refreshCustomer = async (updatedOrObj) => {
    const list = await base44.entities.Customer.filter({ id: customer.id });
    const fresh = list[0] || updatedOrObj || customer;
    setCustomerSession(fresh);
    setCustomer(fresh);
  };

  if (!customer) return <UnifiedLogin onPassengerAuth={handleLogin} />;

  if (!isUnlocked()) {
    return (
      <QuickUnlock
        role="passenger"
        name={customer.name}
        onSubmit={async (pinCode) => {
          if (!validatePin(customer, pinCode)) throw new Error('Feil PIN');
          setUnlocked();
        }}
        onSwitch={() => { clearCustomerSession(); clearRemember(); clearUnlocked(); setCustomer(null); }}
      />
    );
  }

  const content = (
    <>
      <PenaltyAlerts customer={customer} onRefresh={refreshCustomer} />
      {tab === 'tickets' && <MyTickets customer={customer} />}
      {tab === 'buy' && <BuyTicket customer={customer} onRefresh={refreshCustomer} />}
      {tab === 'card' && <TransitCardPanel customer={customer} onRefresh={refreshCustomer} />}
      {tab === 'profile' && <CustomerProfile customer={customer} onRefresh={refreshCustomer} onLogout={handleLogout} />}
    </>
  );

  // ── Mobile format (phone / mobile browser agent) ──
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-2xl">
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

        <main className="flex-1 overflow-y-auto">{content}</main>

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

  // ── Web / desktop format ──
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0a0a0a] text-white px-6 py-3 sticky top-0 z-10 border-b-2 border-[#c0392b]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LSTLogo size={36} />
            <div>
              <p className="font-black text-white text-sm leading-none tracking-wider">LOS SANTOS</p>
              <p className="font-black text-[#c0392b] text-xs leading-none tracking-widest">TRANSIT</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[#c0392b]/20 border border-[#c0392b]/40 rounded-lg px-3 py-1.5">
              <span className="font-black text-white text-sm">{customer.credits || 0}</span>
              <span className="text-[#e74c3c] text-xs ml-1">credits</span>
            </div>
            <nav className="flex items-center gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-[#c0392b] text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
              <button onClick={() => setTab('card')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'card' ? 'bg-[#c0392b] text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <CreditCard className="w-4 h-4" />Transit-kort
              </button>
            </nav>
            <p className="text-slate-400 text-xs hidden lg:block">{customer.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">{content}</main>
    </div>
  );
}