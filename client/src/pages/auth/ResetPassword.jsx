import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../../app/store/authSlice';

export default function ResetPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error } = useSelector((state) => state.auth);
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLocalError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    const result = await dispatch(resetPassword({ token, password: form.password }));
    if (resetPassword.fulfilled.match(result)) {
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 3000);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Invalid Reset Link</h2>
        <p className="text-zinc-500 text-sm mb-6">
          This password reset link is invalid or has expired.
        </p>
        <Link
          to="/auth/forgot-password"
          className="text-sm text-primary-900 hover:text-primary-800 font-medium transition-colors"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Password reset successful</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Your password has been updated. Redirecting you to sign in...
        </p>
        <Link
          to="/auth/login"
          className="text-sm text-primary-900 hover:text-primary-800 font-medium transition-colors"
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-primary-900 mb-1.5">Set new password</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Enter your new password below.
      </p>

      {(error || localError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {localError || error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 pr-10 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-primary-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-3 py-2.5 pr-10 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-primary-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link to="/auth/login" className="text-primary-900 hover:text-primary-800 font-medium transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
