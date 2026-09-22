import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  X,
  RefreshCw,
} from 'lucide-react';
import { forgotPassword, clearError } from '../../app/store/authSlice';
import { cn } from '../../utils/cn';
import { PremiumInput } from '../../components/ui/PremiumFields';

const stateVariants = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -14, scale: 0.98 },
};

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (error) dispatch(clearError());
    const result = await dispatch(forgotPassword(email.trim()));
    if (forgotPassword.fulfilled.match(result)) {
      setSubmitted(true);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setLocalError('');
    if (error) dispatch(clearError());
  };

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        /* Submitted Confirmation State */
        <motion.div
          key="submitted"
          variants={stateVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-center py-2"
        >
          {/* Animated Success Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-14 h-14 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-600 shadow-sm"
          >
            <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
          </motion.div>

          <h2 className="font-heading text-xl sm:text-2xl font-semibold text-primary-900 tracking-tight mb-2">
            Check your inbox
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-4">
            If an account exists for
          </p>

          <div className="inline-block bg-zinc-100 px-3.5 py-1.5 rounded-xl text-primary-900 font-mono text-xs sm:text-sm font-medium mb-5 border border-zinc-200/60 max-w-full truncate">
            {email}
          </div>

          <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed mb-7 max-w-sm mx-auto">
            We&apos;ve sent a secure password reset link. Please click the link within 15 minutes to set a new password.
          </p>

          <div className="space-y-3">
            <Link
              to="/auth/login"
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold bg-primary-900 text-white hover:bg-black active:scale-[0.985] transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(11,11,11,0.25)] flex items-center justify-center gap-2 group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white/80 group-hover:-translate-x-0.5 transition-transform duration-150" />
              <span>Return to sign in</span>
            </Link>

            <button
              type="button"
              onClick={handleResetForm}
              className="w-full py-2.5 text-xs font-semibold text-zinc-500 hover:text-primary-900 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try another email</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* Form Entry State */
        <motion.div
          key="form"
          variants={stateVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header Icon */}
          <div className="mb-5 flex items-center justify-start">
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-primary-900 shadow-sm">
              <KeyRound className="w-5 h-5" strokeWidth={1.8} />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-primary-900">
              Reset password
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              Enter your registered work email and we&apos;ll send you recovery instructions.
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  x: [0, -6, 6, -4, 4, -2, 0],
                }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.35 }}
                className="mb-5 p-3.5 bg-red-50/90 border border-red-200/80 rounded-2xl flex items-start gap-3 shadow-sm"
                role="alert"
              >
                <div className="w-7 h-7 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-600" strokeWidth={1.8} />
                </div>
                <p className="text-xs sm:text-sm font-medium text-red-800 flex-1 min-w-0 pt-0.5">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => dispatch(clearError())}
                  className="text-red-400 hover:text-red-700 p-1 rounded-lg hover:bg-red-100/50 transition-colors shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            <PremiumInput
              label="Work Email"
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                if (error) dispatch(clearError());
                if (localError) setLocalError('');
                setEmail(e.target.value);
              }}
              error={localError}
              placeholder="you@rudhramenterprises.com"
              icon={<Mail className="w-4 h-4" strokeWidth={1.8} />}
            />

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full mt-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer select-none',
                loading
                  ? 'bg-primary-900/70 text-white/80 cursor-not-allowed'
                  : 'bg-primary-900 text-white hover:bg-black active:scale-[0.985] shadow-[0_10px_25px_-5px_rgba(11,11,11,0.25)] hover:shadow-[0_12px_28px_-4px_rgba(11,11,11,0.35)]',
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <>
                  <span>Send reset instructions</span>
                  <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform duration-150" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-900 hover:text-black transition-colors py-1 px-2 rounded-lg hover:bg-zinc-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

