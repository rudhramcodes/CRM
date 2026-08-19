import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { getFieldError } from '../../../utils/getFieldError';
import { cn } from '../../../utils/cn';

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
      <h2 className="font-heading text-lg font-semibold text-primary-900 mb-1.5">
        Sign in to your portal
      </h2>
      <p className="text-sm text-zinc-500 mb-6">
        Track your projects, tasks, and meetings.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5" role="alert">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700">{error}</p>
            {fieldErrors?.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {fieldErrors.map((e, i) => (
                  <li key={i} className="text-xs text-red-500">{e.message}</li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-600 p-0.5 shrink-0" aria-label="Dismiss">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="portal-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="portal-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            className={cn(
              'w-full px-3 py-2.5 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
              fieldError('email')
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
            )}
            placeholder="you@company.com"
          />
          {fieldError('email') && (
            <p className="mt-1 text-xs text-red-500">{fieldError('email')}</p>
          )}
        </div>

        <div>
          <label htmlFor="portal-password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="portal-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              className={cn(
                'w-full px-3 py-2.5 pr-10 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
                fieldError('password')
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
              )}
              placeholder="Enter your password"
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
        </div>

        <div className="flex items-center justify-end">
          <Link
            to="/auth/forgot-password"
            className="text-sm text-zinc-500 hover:text-primary-900 transition-colors"
          >
            Forgot password?
          </Link>
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
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}