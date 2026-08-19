import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ClientSidebar from './ClientSidebar';
import { useGetClientMeQuery } from '../services/clientApi';
import { getBrandTheme } from '../constants/brandThemes';

export default function ClientPortalLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { data: me } = useGetClientMeQuery(undefined, { skip: user?.role !== 'client' });

  const brand = me?.client?.brand || user?.brand || 'aghori';
  const theme = getBrandTheme(brand);

  if (user?.role === 'client' && !user.onboardingCompleted && location.pathname !== '/portal/onboarding') {
    return <Navigate to="/portal/onboarding" replace />;
  }

  return (
    <div data-brand={brand} className="min-h-screen bg-[#fafafa] flex">
      <div className="print:hidden">
        <ClientSidebar
          brand={brand}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
      <div className="flex-1 flex flex-col transition-all duration-300 min-w-0 print:ml-0 lg:ml-64">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-zinc-200 print:hidden">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ backgroundColor: theme.primary }}
            >
              <span>{theme.logoEmoji}</span>
            </div>
            <span className="font-heading font-semibold text-sm text-primary-900">
              {theme.portalName}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded-md hover:bg-zinc-100"
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-zinc-600 mb-1" />
            <span className="block w-5 h-0.5 bg-zinc-600 mb-1" />
            <span className="block w-5 h-0.5 bg-zinc-600" />
          </button>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-auto print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}