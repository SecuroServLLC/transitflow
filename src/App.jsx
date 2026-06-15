import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import CustomerApp from './pages/CustomerApp';
import CustomerWeb from './pages/CustomerWeb';
import CashierSite from './pages/CashierSite';
import TicketMachine from './pages/TicketMachine';
import InspectorSite from './pages/InspectorSite';
import AdminSite from './pages/AdminSite';
import RetailerSite from './pages/RetailerSite.jsx';
import PartnerPortal from './pages/PartnerPortal.jsx';
import FAQPage from './pages/FAQPage.jsx';
import DriverPortal from './pages/DriverPortal.jsx';
import OfficeAdmin from './pages/OfficeAdmin.jsx';
import RoadmapPage from './pages/RoadmapPage.jsx';
import ServiceMessages from './pages/ServiceMessages.jsx';
import InspectorPortal from './pages/system/InspectorPortal.jsx';
import POSTerminal from './pages/system/POSTerminal.jsx';
import TVMPortal from './pages/system/TVMPortal.jsx';
import AdminPortal from './pages/system/AdminPortal.jsx';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <img src="https://media.base44.com/images/public/6a1cc945ce9fabc4f8162a85/e3254d40a_latest-1224696648.webp" alt="LST" className="w-16 h-16 animate-pulse" />
          <div className="w-8 h-8 border-4 border-slate-800 border-t-[#c0392b] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* Passenger */}
      <Route path="/app" element={<CustomerApp />} />
      <Route path="/web" element={<CustomerWeb />} />
      {/* Staff terminals — legacy short URLs still work */}
      <Route path="/pos" element={<CashierSite />} />
      <Route path="/cashier" element={<CashierSite />} />
      <Route path="/tvm" element={<TicketMachine />} />
      <Route path="/machine" element={<TicketMachine />} />
      <Route path="/inspect" element={<InspectorSite />} />
      <Route path="/admin" element={<AdminSite />} />
      {/* /system/ paths — clean staff URLs */}
      <Route path="/system/inspect" element={<InspectorPortal />} />
      <Route path="/system/pos" element={<POSTerminal />} />
      <Route path="/system/tvm" element={<TVMPortal />} />
      <Route path="/system/admin" element={<AdminPortal />} />
      <Route path="/office" element={<OfficeAdmin />} />
      {/* Partners */}
      <Route path="/retail" element={<RetailerSite />} />
      <Route path="/partner" element={<PartnerPortal />} />
      {/* Drivers */}
      <Route path="/driver" element={<DriverPortal />} />
      {/* Info */}
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/roadmap" element={<RoadmapPage />} />
      <Route path="/service" element={<ServiceMessages />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;