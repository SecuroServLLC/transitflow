import { useState } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';
import CustomersManager from '@/components/admin/CustomersManager';
import InspectorsManager from '@/components/admin/InspectorsManager';
import PricingManager from '@/components/admin/PricingManager';
import TicketsOverview from '@/components/admin/TicketsOverview';
import CashierManager from '@/components/admin/CashierManager';
import MachineManager from '@/components/admin/MachineManager';
import AdminRefunds from '@/components/admin/AdminRefunds';
import RetailersManager from '@/components/admin/RetailersManager';
import PartnersManager from '@/components/admin/PartnersManager';
import BusDriversManager from '@/components/admin/BusDriversManager';
import FeesManager from '@/components/admin/FeesManager';
import {
  LayoutDashboard, Users, Shield, Tag, QrCode, LogOut,
  Briefcase, MonitorSmartphone, RotateCcw, Store, Handshake, Bus, Coins
} from 'lucide-react';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'customers',  label: 'Customers',    icon: Users },
  { id: 'tickets',    label: 'Tickets',      icon: QrCode },
  { id: 'refunds',    label: 'Refunds',      icon: RotateCcw },
  { id: 'sep1', sep: true },
  { id: 'cashiers',   label: 'Cashiers',     icon: Briefcase },
  { id: 'inspectors', label: 'Inspectors',   icon: Shield },
  { id: 'drivers',    label: 'Bus Drivers',  icon: Bus },
  { id: 'machines',   label: 'Machines',     icon: MonitorSmartphone },
  { id: 'sep2', sep: true },
  { id: 'retailers',  label: 'Retailers',    icon: Store },
  { id: 'partners',   label: 'Partners',     icon: Handshake },
  { id: 'fees',       label: 'Fees',         icon: Coins },
  { id: 'pricing',    label: 'Pricing',      icon: Tag },
];

const SECTIONS = {
  dashboard: AdminDashboard,
  customers: CustomersManager,
  inspectors: InspectorsManager,
  cashiers: CashierManager,
  machines: MachineManager,
  pricing: PricingManager,
  tickets: TicketsOverview,
  refunds: AdminRefunds,
  retailers: RetailersManager,
  partners: PartnersManager,
  drivers: BusDriversManager,
  fees: FeesManager,
};

export default function AdminSite() {
  const [loggedIn, setLoggedIn] = useState(sessionStorage.getItem('admin_auth') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;

  const logout = () => { sessionStorage.removeItem('admin_auth'); setLoggedIn(false); };
  const Section = SECTIONS[activeTab] || AdminDashboard;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-slate-900 min-h-screen flex flex-col shrink-0 transition-all duration-200`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-white font-bold text-sm">🚌 TransitTicket</h1>
              <p className="text-slate-400 text-xs">Admin Portal</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white text-lg font-bold">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            if (item.sep) return <div key={item.id} className="my-2 border-t border-slate-800" />;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-2 border-t border-slate-700">
          <button onClick={logout} title="Logout"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Section />
      </main>
    </div>
  );
}