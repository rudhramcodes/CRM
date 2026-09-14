import { Outlet } from 'react-router-dom';

// A subtle SVG noise pattern
const grainUrl = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E";

export default function InquiryPortalLayout() {
  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ 
        backgroundColor: '#F6F1E0', 
        color: '#3B2515',
        fontFamily: 'var(--font-apex, "Apex New Trial", sans-serif)'
      }}
    >
      {/* Grain Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.3]"
        style={{ backgroundImage: `url("${grainUrl}")`, mixBlendMode: 'multiply' }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="py-8 px-6 sm:px-12 w-full flex justify-center items-center">
          <div className="text-center space-y-1 select-none">
            <h1 
              className="text-3xl md:text-4xl tracking-widest uppercase font-bold" 
              style={{ color: '#B47737', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
            >
              Rudhram
            </h1>
            <p className="text-xs md:text-sm font-medium opacity-70 uppercase tracking-[0.3em]">
              Ventures
            </p>
          </div>
        </header>
        
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 md:py-12 flex flex-col justify-center items-center">
          <Outlet />
        </div>
        
        <footer className="py-8 text-center text-xs opacity-50 tracking-wider">
          © {new Date().getFullYear()} RUDHRAM ENTERPRISES. ALL RIGHTS RESERVED.
        </footer>
      </div>
    </div>
  );
}
