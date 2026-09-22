import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { acceptInvite, clearError } from '../../../app/store/authSlice';
import { cn } from '../../../utils/cn';
import { PremiumInput } from '../../../components/ui/PremiumFields';

const PWD_GUIDE = [
  { key: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number (0-9)', test: (v) => /[0-9]/.test(v) },
];

export default function AcceptInvite() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, fieldErrors } = useSelector((state) => state.auth);
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!token) {
      setLocalError('This invitation link is missing its verification token. Please click the link sent in your invitation email.');
    }
    return () => {
      dispatch(clearError());
    };
  }, [token, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setTouched({ password: true, confirmPassword: true });

    if (!form.password) {
      setLocalError('Please create a password');
      return;
    }

    const allPassed = PWD_GUIDE.every((rule) => rule.test(form.password));
    if (!allPassed) {
      setLocalError('Password does not meet all security criteria');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    const result = await dispatch(acceptInvite({ token, password: form.password }));
    if (acceptInvite.fulfilled.match(result)) {
      setSuccess(true);
      setTimeout(() => navigate('/portal/login'), 2500);
    }
  };

  const fieldError = (name) =>
    touched[name] ? (fieldErrors || []).find((e) => e.field === name)?.message || '' : '';

  // Invalid / Missing Token View
  if (!token) {
    return (
      <div className="text-center py-2">
        <div className="w-14 h-14 bg-red-50 border border-red-200/80 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-sm">
          <ShieldAlert className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <h2 className="font-heading text-xl sm:text-2xl font-semibold text-primary-900 tracking-tight mb-2">
          Invalid Invitation Link
        </h2>
        <p className="text-zinc-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          This portal invitation link is invalid or has expired. Please check the email sent by Rudhram or request a new invite.
        </p>
        <Link
          to="/portal/login"
          className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold bg-primary-900 text-white hover:bg-black active:scale-[0.985] transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(11,11,11,0.25)] inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to client sign in</span>
        </Link>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="text-center py-2">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-14 h-14 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-600 shadow-sm"
        >
          <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
        </motion.div>
        <h2 className="font-heading text-xl sm:text-2xl font-semibold text-primary-900 tracking-tight mb-2">
          Account activated!
        </h2>
        <p className="text-zinc-500 text-sm leading-relaxed mb-6">
          Your portal password has been created. Redirecting you to sign in...
        </p>
        <Link
          to="/portal/login"
          className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold bg-primary-900 text-white hover:bg-black active:scale-[0.985] transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(11,11,11,0.25)] flex items-center justify-center gap-2"
        >
          <span>Sign in immediately</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Active Acceptance Form
  return (
    <div>
      {/* Header Icon */}
      <div className="mb-5 flex items-center justify-start">
        <div className="w-11 h-11 rounded-2xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-primary-900 shadow-sm">
          <Sparkles className="w-5 h-5 text-primary-900" strokeWidth={1.8} />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-primary-900">
          Activate your client portal
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Create your password to access all project assets, deliverables, and invoices.
        </p>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {(error || localError) && (
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
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs sm:text-sm font-medium text-red-800">
                {localError || error}
              </p>
              {fieldErrors?.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {fieldErrors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600 font-normal">
                      {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                dispatch(clearError());
              }}
              className="text-red-400 hover:text-red-700 p-1 rounded-lg hover:bg-red-100/50 transition-colors shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
        {/* New Password */}
        <div>
          <PremiumInput
            label="Create Password"
            id="invite-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => {
              if (error) dispatch(clearError());
              if (localError) setLocalError(null);
              setForm({ ...form, password: e.target.value });
            }}
            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
            error={fieldError('password')}
            placeholder="Create a strong password"
            icon={<Lock className="w-4 h-4" strokeWidth={1.8} />}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 rounded-lg hover:bg-zinc-100"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            }
          />

          {/* Password Requirements Checklist */}
          {form.password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 space-y-1.5"
            >
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Password requirements
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PWD_GUIDE.map((rule) => {
                  const pass = rule.test(form.password);
                  return (
                    <div
                      key={rule.key}
                      className={cn(
                        'text-xs flex items-center gap-1.5 transition-colors',
                        pass ? 'text-emerald-700 font-medium' : 'text-zinc-400',
                      )}
                    >
                      {pass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 shrink-0" />
                      )}
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <PremiumInput
            label="Confirm Password"
            id="invite-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => {
              if (localError === 'Passwords do not match') setLocalError(null);
              setForm({ ...form, confirmPassword: e.target.value });
            }}
            onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
            error={
              localError === 'Passwords do not match'
                ? 'Passwords do not match'
                : undefined
            }
            placeholder="Repeat your password"
            icon={<Lock className="w-4 h-4" strokeWidth={1.8} />}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 rounded-lg hover:bg-zinc-100"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            }
          />
        </div>

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
              <span>Activating portal...</span>
            </>
          ) : (
            <>
              <span>Activate account &amp; proceed</span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform duration-150" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-zinc-100 text-center">
        <Link
          to="/portal/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-900 hover:text-black transition-colors py-1 px-2 rounded-lg hover:bg-zinc-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to client sign in</span>
        </Link>
      </div>
    </div>
  );
}