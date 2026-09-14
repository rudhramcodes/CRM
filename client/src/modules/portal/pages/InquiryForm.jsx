import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Send, CheckCircle2 } from 'lucide-react';
import { useSubmitPublicInquiryMutation } from '../../../services/leadApi';
import toast from 'react-hot-toast';

export default function InquiryForm() {
  const { brand } = useParams();
  const navigate = useNavigate();
  const [submitInquiry, { isLoading }] = useSubmitPublicInquiryMutation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const normalizedBrand = brand?.toLowerCase();
  const isValidBrand = ['panigrahna', 'aghori'].includes(normalizedBrand);

  if (!isValidBrand) {
    return (
      <div className="text-center w-full flex flex-col items-center justify-center min-h-[50vh]">
        <h2 
          className="text-4xl font-bold mb-6" 
          style={{ color: '#3B2515', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
        >
          Invalid Venture
        </h2>
        <Link 
          to="/inquiry" 
          className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
          style={{ backgroundColor: '#B47737', color: '#F6F1E0' }}
        >
          Go back to selection
        </Link>
      </div>
    );
  }

  const brandName = normalizedBrand === 'panigrahna' ? 'Panigrahana' : 'Aghhori';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      company: formData.get('company'),
      brand: normalizedBrand,
      notes: [{ text: formData.get('notes') }]
    };

    try {
      await submitInquiry(data).unwrap();
      setIsSubmitted(true);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to submit inquiry. Please try again.');
    }
  };

  if (isSubmitted) {
    return (
      <div 
        className="flex flex-col items-center justify-center space-y-8 text-center w-full max-w-xl mx-auto p-12 md:p-16 rounded-[2rem] shadow-xl border border-[#B47737]/10 fade-in" 
        style={{ backgroundColor: '#DCC19D' }}
      >
        <div className="p-4 rounded-full" style={{ backgroundColor: '#F6F1E0' }}>
          <CheckCircle2 className="w-16 h-16" style={{ color: '#B47737' }} strokeWidth={1.5} />
        </div>
        <div className="space-y-4">
          <h2 
            className="text-5xl font-bold" 
            style={{ color: '#3B2515', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
          >
            Thank You
          </h2>
          <p className="text-lg opacity-80" style={{ color: '#3B2515' }}>
            Your inquiry for <strong>{brandName}</strong> has been received successfully. Our team will get back to you shortly.
          </p>
        </div>
        <button 
          onClick={() => navigate('/inquiry')}
          className="mt-4 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all hover:scale-105 shadow-lg"
          style={{ backgroundColor: '#3B2515', color: '#F6F1E0' }}
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto fade-in">
      <Link 
        to="/inquiry" 
        className="inline-flex items-center gap-2 mb-10 px-4 py-2 rounded-full opacity-60 hover:opacity-100 hover:bg-[#DCC19D]/50 transition-all"
        style={{ color: '#3B2515' }}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm font-bold tracking-wider uppercase">Back to Selection</span>
      </Link>

      <div className="text-center mb-12">
        <h2 
          className="text-5xl md:text-6xl font-bold mb-4" 
          style={{ color: '#3B2515', fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
        >
          {brandName} Inquiry
        </h2>
        <p className="opacity-75 text-lg md:text-xl font-light" style={{ color: '#3B2515' }}>
          Fill out the form below and we will craft something beautiful together.
        </p>
      </div>

      <div className="p-8 md:p-12 rounded-[2rem] shadow-2xl border border-[#B47737]/20" style={{ backgroundColor: '#DCC19D' }}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-[0.2em] opacity-80" style={{ color: '#3B2515' }}>Full Name *</label>
              <input 
                type="text" 
                name="name"
                required
                className="w-full px-5 py-4 rounded-xl border border-transparent focus:border-[#B47737] outline-none transition-all placeholder-opacity-40"
                style={{ backgroundColor: '#F6F1E0', color: '#3B2515' }}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-[0.2em] opacity-80" style={{ color: '#3B2515' }}>Email Address *</label>
              <input 
                type="email" 
                name="email"
                required
                className="w-full px-5 py-4 rounded-xl border border-transparent focus:border-[#B47737] outline-none transition-all placeholder-opacity-40"
                style={{ backgroundColor: '#F6F1E0', color: '#3B2515' }}
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-[0.2em] opacity-80" style={{ color: '#3B2515' }}>Phone Number *</label>
              <input 
                type="tel" 
                name="phone"
                required
                className="w-full px-5 py-4 rounded-xl border border-transparent focus:border-[#B47737] outline-none transition-all placeholder-opacity-40"
                style={{ backgroundColor: '#F6F1E0', color: '#3B2515' }}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-[0.2em] opacity-80" style={{ color: '#3B2515' }}>Company / Organization</label>
              <input 
                type="text" 
                name="company"
                className="w-full px-5 py-4 rounded-xl border border-transparent focus:border-[#B47737] outline-none transition-all placeholder-opacity-40"
                style={{ backgroundColor: '#F6F1E0', color: '#3B2515' }}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-[0.2em] opacity-80" style={{ color: '#3B2515' }}>How can we help you? *</label>
            <textarea 
              name="notes"
              required
              rows="5"
              className="w-full px-5 py-4 rounded-xl border border-transparent focus:border-[#B47737] outline-none transition-all placeholder-opacity-40 resize-none"
              style={{ backgroundColor: '#F6F1E0', color: '#3B2515' }}
              placeholder="Tell us about your event, dates, and requirements..."
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:hover:scale-100"
            style={{ backgroundColor: '#3B2515', color: '#F6F1E0' }}
          >
            {isLoading ? 'Submitting...' : (
              <>
                Submit Inquiry
                <Send className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
