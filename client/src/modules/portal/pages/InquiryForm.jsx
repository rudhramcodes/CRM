import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubmitPublicInquiryMutation } from '../../../services/leadApi';
import PhoneInput from '../../../components/forms/PhoneInput';
import toast from 'react-hot-toast';

export default function InquiryForm() {
  const { brand } = useParams();
  const navigate = useNavigate();
  const [submitInquiry, { isLoading }] = useSubmitPublicInquiryMutation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const normalizedBrand = brand?.toLowerCase();
  const isValidBrand = ['panigrahna', 'aghori'].includes(normalizedBrand);

  if (!isValidBrand) {
    return (
      <div className="text-center w-full flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <h2 
          className="text-3xl font-semibold text-zinc-900" 
          style={{ fontFamily: 'var(--font-golden, Goldenbook, serif)' }}
        >
          Invalid Venture
        </h2>
        <Link 
          to="/inquiry" 
          className="px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-widest bg-zinc-900 text-white hover:bg-zinc-800 transition-all"
        >
          Return to Selection
        </Link>
      </div>
    );
  }

  const brandName = normalizedBrand === 'panigrahna' ? 'Panigrahana' : 'Aghhori';
  const brandCategory = normalizedBrand === 'panigrahna' ? 'Wedding Cinematography' : 'Advertising and Media Productions';
  const brandLogo = normalizedBrand === 'panigrahna'
    ? 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784704090/pg-logo-with-name.png'
    : 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784535471/ag-logo.avif';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 6) {
      setPhoneError('Please enter a valid phone number');
      toast.error('Please enter a valid phone number');
      return;
    }
    setPhoneError('');

    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: phone.trim(),
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-lg mx-auto p-10 sm:p-14 rounded-3xl bg-white border border-zinc-200/90 shadow-lg" 
      >
        <div className="h-12 flex items-center justify-center mb-1">
          <img 
            src={brandLogo} 
            alt={brandName}
            className="h-full w-auto max-w-[160px] object-contain"
          />
        </div>
        <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900">
          <CheckCircle2 className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-heading">
            Inquiry Received
          </h2>
          <p className="text-sm text-zinc-500 font-normal leading-relaxed font-sans">
            Your inquiry for <span className="text-zinc-900 font-medium">{brandName}</span> has been received. Our team will get in touch with you shortly.
          </p>
        </div>
        <button 
          onClick={() => navigate('/inquiry')}
          className="mt-4 px-8 py-3 rounded-full font-semibold uppercase tracking-widest text-xs transition-all bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer font-heading"
        >
          Back to Selection
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Back button */}
      <Link 
        to="/inquiry" 
        className="group inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-zinc-200/80 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-all text-xs tracking-wider uppercase font-semibold font-heading"
      >
        <ChevronLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
        <span>Back to Selection</span>
      </Link>

      {/* Header with Venture Logo */}
      <div className="text-center mb-10 flex flex-col items-center space-y-2.5">
        <div className="h-12 sm:h-14 flex items-center justify-center mb-1">
          <img 
            src={brandLogo} 
            alt={brandName}
            className="h-full w-auto max-w-[190px] object-contain"
          />
        </div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-400 font-heading">
          {brandCategory}
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-heading">
          {brandName} Inquiry
        </h2>
        <p className="text-sm text-zinc-500 font-normal leading-relaxed max-w-md mx-auto font-sans">
          Please fill in your details and requirements below. Our team will connect with you soon.
        </p>
      </div>

      {/* Form Card */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white border border-zinc-200/90 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-heading">Full Name *</label>
              <input 
                type="text" 
                name="name"
                required
                className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 text-sm outline-none transition-all focus:bg-white focus:border-zinc-900"
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-heading">Email Address *</label>
              <input 
                type="email" 
                name="email"
                required
                className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 text-sm outline-none transition-all focus:bg-white focus:border-zinc-900"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            <div>
              <PhoneInput 
                label="Phone Number *"
                name="phone"
                required
                value={phone}
                onChange={(val) => {
                  setPhone(val || '');
                  if (phoneError) setPhoneError('');
                }}
                error={phoneError}
                placeholder="98765 43210"
                labelClassName="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-heading"
                buttonClassName="h-11 sm:h-12 rounded-l-xl bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                inputClassName="h-11 sm:h-12 rounded-r-xl bg-zinc-50 border-zinc-200 focus:bg-white focus:border-zinc-900 focus:ring-0 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-heading">Company or Organization</label>
              <input 
                type="text" 
                name="company"
                className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 text-sm outline-none transition-all focus:bg-white focus:border-zinc-900"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">How can we help you? *</label>
            <textarea 
              name="notes"
              required
              rows="4"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 text-sm outline-none transition-all focus:bg-white focus:border-zinc-900 resize-none"
              placeholder="Tell us about your event dates, location, and requirements"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="group w-full py-4 rounded-xl font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2.5 transition-all bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Submitting...' : (
              <>
                <span>Submit Inquiry</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
