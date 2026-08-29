import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../../app/store/authSlice';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../constants';
import axios from 'axios';

export default function ChangePassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword) { setError('Current password is required'); return; }
    if (!form.newPassword) { setError('New password is required'); return; }
    if (form.newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.currentPassword === form.newPassword) { setError('New password must be different from current password'); return; }

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
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-amber-500" />
        <h2 className="font-heading text-lg font-semibold text-primary-900">Change Your Password</h2>
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        For your security, please change your default password before continuing.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5" role="alert">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              required
              value={form.currentPassword}
              onChange={handleChange('currentPassword')}
              className={cn(
                'w-full px-3 py-2.5 pr-10 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
                'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
              )}
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              required
              value={form.newPassword}
              onChange={handleChange('newPassword')}
              className={cn(
                'w-full px-3 py-2.5 pr-10 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
                'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
              )}
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            className={cn(
              'w-full px-3 py-2.5 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
              'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
            )}
            placeholder="Confirm new password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
            loading
              ? 'bg-primary-900/70 text-white/80 cursor-not-allowed'
              : 'bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-700',
          )}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Changing password...
            </>
          ) : (
            'Change Password & Continue'
          )}
        </button>
      </form>
    </div>
  );
}
