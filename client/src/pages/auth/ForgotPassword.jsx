import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';
import { forgotPassword, clearError } from '../../app/store/authSlice';
import { cn } from '../../utils/cn';

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) dispatch(clearError());
    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-green-600" strokeWidth={1.5} />
        </div>
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
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5" role="alert">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600 p-0.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => { if (error) dispatch(clearError()); setEmail(e.target.value); }}
            className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-primary-900 placeholder-zinc-400 outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            placeholder="you@company.com"
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
              Sending...
            </>
          ) : (
            'Send instructions'
          )}
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
