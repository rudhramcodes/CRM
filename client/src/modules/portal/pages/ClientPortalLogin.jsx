import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight, Loader2, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { getFieldError } from '../../../utils/getFieldError';
import { cn } from '../../../utils/cn';
import { PremiumInput } from '../../../components/ui/PremiumFields';

export default function ClientPortalLogin() {
  const { login, loading, error, fieldErrors, clearError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    return () => clearError();
  }, []);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (error) clearError();
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    await login(form);
  };

  const fieldError = (name) => (touched[name] ? getFieldError(fieldErrors, name) : '');

  return (
    <div>
      {/* Title & subtitle */}
      <div className="mb-6">
        <h2 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-primary-900">
          Client sign in
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Access your dedicated portal to view project milestones, assets &amp; invoices.
        </p>
      </div>

      {/* Error banner with shake animation */}
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
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs sm:text-sm font-medium text-red-800">{error}</p>
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
              onClick={clearError}
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
          label="Email Address"
          id="portal-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          error={fieldError('email')}
          placeholder="client@company.com"
          icon={<Mail className="w-4 h-4" strokeWidth={1.8} />}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="portal-password"
              className="block text-sm font-medium text-zinc-700"
            >
              Password
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-xs text-zinc-500 hover:text-primary-900 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <PremiumInput
            id="portal-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            error={fieldError('password')}
            placeholder="Enter your portal password"
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
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign in to portal</span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform duration-150" />
            </>
          )}
        </button>
      </form>

      {/* Staff CRM Link */}
      <div className="mt-6 pt-5 border-t border-zinc-100 flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-zinc-500">
          Internal team or administrator?
        </p>
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-900 hover:text-black py-1.5 px-3 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <span>Sign in to Team CRM</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}