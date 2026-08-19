import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { acceptInvite, clearError } from '../../../app/store/authSlice';
import { cn } from '../../../utils/cn';

const PWD_GUIDE = [
  { key: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /[0-9]/.test(v) },
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
      setLocalError('This invite link is missing its token. Please use the link from your invitation email.');
    }
    return () => { dispatch(clearError()); };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setTouched({ password: true, confirmPassword: true });

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    const result = await dispatch(acceptInvite({ token, password: form.password }));
    if (acceptInvite.fulfilled.match(result)) {
      setSuccess(true);
      setTimeout(() => navigate('/portal/login'), 3000);
    }
  };

  const fieldError = (name) => (touched[name] ? (fieldErrors || []).find((e) => e.field === name)?.message || '' : '');

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Invalid Invite Link</h2>
        <p className="text-zinc-500 text-sm mb-6">
          This invite link is invalid or expired. Please use the link from your invitation email.
        </p>
        <p className="text-zinc-400 text-xs">
          Still having trouble? Contact your account team for a new invitation.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" strokeWidth={1.5} />
        </div>
        <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Password set successfully</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Your password has been set. Redirecting you to sign in...
        </p>
        <Link
          to="/portal/login"
          className="text-sm text-primary-900 hover:text-primary-800 font-medium transition-colors"
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-primary-900 mb-1.5">Set your password</h2>
      <p className="text-sm text-zinc-500 mb-6">
        You've been invited to the client portal. Choose a password to get started.
      </p>

      {(error || localError) && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5" role="alert">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700">{localError || error}</p>
            {(localError?.includes('expired') || error) && (
              <p className="mt-1 text-xs text-red-500">
                Contact your account team if this keeps happening.
              </p>
            )}
          </div>
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600 p-0.5 shrink-0" aria-label="Dismiss">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="invite-password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              id="invite-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => { if (error) dispatch(clearError()); setForm({ ...form, password: e.target.value }); }}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              className={cn(
                'w-full px-3 py-2.5 pr-10 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 outline-none focus:ring-1',
                fieldError('password')
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
              )}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldError('password') && (
            <p className="mt-1 text-xs text-red-500">{fieldError('password')}</p>
          )}
          {form.password.length > 0 && (
            <div className="mt-2 space-y-1">
              {PWD_GUIDE.map((rule) => {
                const pass = rule.test(form.password);
                return (
                  <p key={rule.key} className={cn('text-xs flex items-center gap-1.5', pass ? 'text-green-600' : 'text-zinc-400')}>
                    {pass ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-zinc-300" />}
                    {rule.label}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="invite-confirm-password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="invite-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
              className={cn(
                'w-full px-3 py-2.5 pr-10 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 outline-none focus:ring-1',
                localError === 'Passwords do not match'
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
              )}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {localError === 'Passwords do not match' && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
          )}
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
              Setting password...
            </>
          ) : (
            'Set password & continue'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link to="/portal/login" className="text-primary-900 hover:text-primary-800 font-medium transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}