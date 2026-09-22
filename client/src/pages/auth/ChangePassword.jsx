import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../../app/store/authSlice';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../constants';
import axios from 'axios';
import { PremiumInput } from '../../components/ui/PremiumFields';

const PWD_GUIDE = [
  { key: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number (0-9)', test: (v) => /[0-9]/.test(v) },
];

export default function ChangePassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword) {
      setError('Current password is required');
      return;
    }
    if (!form.newPassword) {
      setError('New password is required');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        { currentPassword: form.currentPassword, newPassword: form.newPassword },
        { withCredentials: true },
      );

      const updatedUser = { ...user, mustChangePassword: false };
      dispatch(setUser(updatedUser));
      localStorage.setItem('user', JSON.stringify(updatedUser));

      navigate(user?.role === 'client' ? '/portal' : '/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Security notice header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-sm shrink-0">
          <ShieldAlert className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider bg-amber-100/60 px-2 py-0.5 rounded-md">
            Security Action Required
          </span>
          <h2 className="font-heading text-lg sm:text-xl font-semibold tracking-tight text-primary-900 mt-1">
            Change your password
          </h2>
        </div>
      </div>

      <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
        For your security, you must update your temporary or default password before entering the CRM workspace.
      </p>

      {/* Error Alert */}
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
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-700 p-1 rounded-lg hover:bg-red-100/50 transition-colors shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
        {/* Current Password */}
        <div>
          <PremiumInput
            label="Current Password"
            id="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            required
            value={form.currentPassword}
            onChange={handleChange('currentPassword')}
            placeholder="Enter current password"
            icon={<Lock className="w-4 h-4" strokeWidth={1.8} />}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 rounded-lg hover:bg-zinc-100"
                tabIndex={-1}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            }
          />
        </div>

        {/* New Password */}
        <div>
          <PremiumInput
            label="New Password"
            id="newPassword"
            type={showNew ? 'text' : 'password'}
            required
            value={form.newPassword}
            onChange={handleChange('newPassword')}
            placeholder="Enter a strong new password"
            icon={<Lock className="w-4 h-4" strokeWidth={1.8} />}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 rounded-lg hover:bg-zinc-100"
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            }
          />

          {/* Password Checklist */}
          {form.newPassword.length > 0 && (
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
                  const pass = rule.test(form.newPassword);
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

        {/* Confirm New Password */}
        <div>
          <PremiumInput
            label="Confirm New Password"
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            required
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            placeholder="Repeat your new password"
            icon={<Lock className="w-4 h-4" strokeWidth={1.8} />}
            trailingAction={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1.5 rounded-lg hover:bg-zinc-100"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
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
              <span>Saving password...</span>
            </>
          ) : (
            <>
              <span>Update password &amp; continue</span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform duration-150" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

