import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ClientSidebar from './ClientSidebar';
import Header from './Header';
import { cn } from '../utils/cn';

export default function ClientPortalLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  if (user?.role === 'client' && !user.onboardingCompleted && location.pathname !== '/portal/onboarding') {
    return <Navigate to="/portal/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex relative overflow-x-hidden">
      <div className="print:hidden relative z-20">
        <ClientSidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0 print:ml-0 relative z-10',
          sidebarOpen ? 'lg:ml-56' : 'lg:ml-16',
        )}
      >
        <div className="print:hidden sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-zinc-200 shadow-sm">
          <Header onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        </div>
        <main className="flex-1 p-5 sm:p-7 lg:p-9 overflow-auto print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}