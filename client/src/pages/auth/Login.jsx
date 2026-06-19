import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(form);
  };

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-primary-900 mb-6">
        Sign in
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={clearError} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-primary-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 pr-10 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-primary-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
              placeholder="Enter your password"
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
          className="w-full py-2.5 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link to="/auth/register" className="text-primary-900 hover:text-primary-800 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </div>
  );
}
