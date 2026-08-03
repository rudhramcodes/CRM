import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '../utils/cn';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const user = useSelector((state) => state.auth.user);

  if (user && !user.isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      <div className="print:hidden">
        <Sidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 min-w-0 print:ml-0',
          sidebarOpen ? 'lg:ml-56' : 'lg:ml-16',
        )}
      >
        <div className="print:hidden">
          <Header onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        </div>
        <main className="flex-1 p-6 lg:p-8 overflow-auto print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
