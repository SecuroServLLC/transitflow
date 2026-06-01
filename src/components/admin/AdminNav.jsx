import { LayoutDashboard, Users, Shield, Tag, QrCode, LogOut } from 'lucide-react';

const navItems = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'customers',  label: 'Customers',  icon: Users },
  { id: 'inspectors', label: 'Inspectors', icon: Shield },
  { id: 'pricing',    label: 'Pricing',    icon: Tag },
  { id: 'tickets',    label: 'Tickets',    icon: QrCode },
];

export default function AdminNav({ activeTab, onTabChange, onLogout }) {
  return (
    <aside className="w-60 bg-slate-900 min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-white font-bold text-lg">🚌 TransitTicket</h1>
        <p className="text-slate-400 text-xs mt-0.5">Admin Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" />Logout
        </button>
      </div>
    </aside>
  );
}