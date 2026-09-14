import { Link } from 'react-router-dom';
import { Camera, Sparkles } from 'lucide-react';

export default function InquirySelection() {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 w-full fade-in">
      <div className="text-center space-y-6 max-w-3xl px-4">
        <h2 
          className="text-5xl md:text-6xl lg:text-7xl font-bold" 
          style={{ color: '#3B2515', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
        >
          Welcome to our World
        </h2>
        <p className="text-lg md:text-xl opacity-75 font-light" style={{ color: '#3B2515' }}>
          Select the venture you would like to inquire about. We look forward to creating magic with you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full max-w-4xl px-4">
        {/* Panigrahana Card */}
        <Link 
          to="/inquiry/panigrahna"
          className="group relative flex flex-col items-center justify-center p-12 lg:p-16 text-center rounded-[2rem] transition-all duration-700 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 border border-[#B47737]/10"
          style={{ backgroundColor: '#DCC19D' }}
        >
          <div className="absolute inset-0 bg-[#F6F1E0] opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
          
          <div className="mb-8 p-5 rounded-full shadow-inner transform group-hover:scale-110 transition-transform duration-700" style={{ backgroundColor: '#F6F1E0' }}>
            <Camera className="w-10 h-10" style={{ color: '#B47737' }} strokeWidth={1.5} />
          </div>
          
          <h3 
            className="font-bold text-3xl md:text-4xl mb-4" 
            style={{ color: '#3B2515', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
          >
            Panigrahana
          </h3>
          <p className="text-sm md:text-base font-medium opacity-70 tracking-wide uppercase" style={{ color: '#3B2515' }}>
            Premium Wedding Photography
          </p>
        </Link>

        {/* Aghhori Card */}
        <Link 
          to="/inquiry/aghori"
          className="group relative flex flex-col items-center justify-center p-12 lg:p-16 text-center rounded-[2rem] transition-all duration-700 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 border border-[#B47737]/10"
          style={{ backgroundColor: '#DCC19D' }}
        >
          <div className="absolute inset-0 bg-[#F6F1E0] opacity-0 group-hover:opacity-10 transition-opacity duration-700" />
          
          <div className="mb-8 p-5 rounded-full shadow-inner transform group-hover:scale-110 transition-transform duration-700" style={{ backgroundColor: '#F6F1E0' }}>
            <Sparkles className="w-10 h-10" style={{ color: '#B47737' }} strokeWidth={1.5} />
          </div>
          
          <h3 
            className="font-bold text-3xl md:text-4xl mb-4" 
            style={{ color: '#3B2515', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
          >
            Aghhori
          </h3>
          <p className="text-sm md:text-base font-medium opacity-70 tracking-wide uppercase" style={{ color: '#3B2515' }}>
            Exclusive Events & Experiences
          </p>
        </Link>
      </div>
    </div>
  );
}
