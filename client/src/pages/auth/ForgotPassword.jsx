import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../../app/store/authSlice';

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Check your email</h2>
        <p className="text-zinc-500 text-sm mb-6">
          If an account with <strong className="text-primary-900">{email}</strong> exists, we&apos;ve sent password reset instructions.
        </p>
        <Link
          to="/auth/login"
          className="text-sm text-primary-900 hover:text-primary-800 font-medium transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold text-primary-900 mb-1.5">Reset password</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Enter your email and we&apos;ll send you reset instructions.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-primary-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Send instructions'}
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
