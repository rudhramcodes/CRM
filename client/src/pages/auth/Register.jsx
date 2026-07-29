import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getFieldError } from '../../utils/getFieldError';
import { cn } from '../../utils/cn';

const PWD_GUIDE = [
  { key: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /[0-9]/.test(v) },
];

export default function Register() {
  const { register, loading, error, fieldErrors, clearError } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    return () => clearError();
  }, []);

  const handleChange = (field) => (e) => {
    if (error) clearError();
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    await register(form);
  };

  const fieldError = (name) => (touched[name] ? getFieldError(fieldErrors, name) : '');

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-primary-900 mb-6">Create account</h2>

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
          <button onClick={clearError} className="text-red-400 hover:text-red-600 p-0.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={form.name}
            onChange={handleChange('name')}
            onBlur={handleBlur('name')}
            className={cn(
              'w-full px-3 py-2.5 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
              fieldError('name')
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-zinc-200 focus:ring-primary-900 focus:border-primary-900',
            )}
            placeholder="John Doe"
          />
          {fieldError('name') && (
            <p className="mt-1 text-xs text-red-500">{fieldError('name')}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              className={cn(
                'w-full px-3 py-2.5 pr-10 bg-zinc-50 border rounded-lg text-sm text-primary-900 placeholder-zinc-400 transition-colors outline-none focus:ring-1',
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
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary-900 hover:text-primary-800 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
