import { useState } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminNav from '@/components/admin/AdminNav';
import AdminDashboard from '@/components/admin/AdminDashboard';
import CustomersManager from '@/components/admin/CustomersManager';
import InspectorsManager from '@/components/admin/InspectorsManager';
import PricingManager from '@/components/admin/PricingManager';
import TicketsOverview from '@/components/admin/TicketsOverview';

export default function AdminSite() {
  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('admin_auth') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isLoggedIn) return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;

  const handleLogout = () => { sessionStorage.removeItem('admin_auth'); setIsLoggedIn(false); };

  const sections = {
    dashboard:  <AdminDashboard />,
    customers:  <CustomersManager />,
    inspectors: <InspectorsManager />,
    pricing:    <PricingManager />,
    tickets:    <TicketsOverview />,
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminNav activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 p-8 overflow-auto">{sections[activeTab]}</main>
    </div>
  );
}