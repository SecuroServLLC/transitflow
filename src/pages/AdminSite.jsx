import { useState } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminNav from '@/components/admin/AdminNav';
import AdminDashboard from '@/components/admin/AdminDashboard';
import CustomersManager from '@/components/admin/CustomersManager';
import InspectorsManager from '@/components/admin/InspectorsManager';
import PricingManager from '@/components/admin/PricingManager';
import TicketsOverview from '@/components/admin/TicketsOverview';

const SECTIONS = {
  dashboard: AdminDashboard,
  customers: CustomersManager,
  inspectors: InspectorsManager,
  pricing: PricingManager,
  tickets: TicketsOverview,
};

export default function AdminSite() {
  const [loggedIn, setLoggedIn] = useState(sessionStorage.getItem('admin_auth') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;

  const logout = () => { sessionStorage.removeItem('admin_auth'); setLoggedIn(false); };
  const Section = SECTIONS[activeTab] || AdminDashboard;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminNav activeTab={activeTab} onTabChange={setActiveTab} onLogout={logout} />
      <main className="flex-1 p-8 overflow-auto">
        <Section />
      </main>
    </div>
  );
}