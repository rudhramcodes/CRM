import { Outlet } from 'react-router-dom';

export default function InquiryPortalLayout() {
  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col bg-white text-zinc-900 font-sans selection:bg-zinc-100">
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Logo Header */}
        <header className="pt-5 pb-1 px-6 sm:px-12 w-full flex justify-center items-center shrink-0">
          <div className="flex flex-col items-center select-none">
            <img 
              src="/rudhram-logo.png" 
              alt="Rudhram Ventures" 
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-center py-2 sm:py-3">
          <Outlet />
        </main>
        
        {/* Minimal Footer */}
        <footer className="py-3 text-center text-[10px] sm:text-[11px] tracking-[0.2em] text-zinc-400 uppercase font-medium select-none shrink-0">
          © {new Date().getFullYear()} Rudhram Enterprises. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
