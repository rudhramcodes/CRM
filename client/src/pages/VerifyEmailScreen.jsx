import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ShieldCheck, LogOut } from 'lucide-react';
import RefreshCwIcon from '../components/ui/RefreshCwIcon';
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { setUser } from '../app/store/authSlice';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

const RESEND_COOLDOWN = 60;
const OTP_EXPIRY = 600; // 10 minutes, matches server OTP_EXPIRY_MS

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function VerifyEmailScreen() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useSelector((state) => state.auth.user);

  const [digits, setDigits] = useState(Array(6).fill(''));
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiry, setExpiry] = useState(OTP_EXPIRY);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [shake, setShake] = useState(0);

  const inputsRef = useRef([]);
  const autoSentRef = useRef(false);
  const email = user?.email || '';

  const otp = digits.join('');

  useEffect(() => {
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    if (user && !user.isEmailVerified) resendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!sent || verified || expiry <= 0) return;
    const t = setTimeout(() => setExpiry((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, verified, expiry]);

  const focusBox = (i) => inputsRef.current[i]?.focus();

  const resendCode = async () => {
    setError('');
    setDigits(Array(6).fill(''));
    setVerifying(false);
    try {
      await axios.post(
        `${API_BASE_URL}/auth/resend-verification`,
        { email },
        { withCredentials: true },
      );
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
      setExpiry(OTP_EXPIRY);
      focusBox(0);
    } catch {
      setError('Could not send the code. Please try again.');
    }
  };

  const handleChange = (i, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return;
    const next = [...digits];
    next[i] = clean[clean.length - 1];
    setDigits(next);
    setError('');
    if (i < 5) focusBox(i + 1);
    else inputsRef.current[5]?.blur();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = '';
        setDigits(next);
      } else if (i > 0) {
        next[i - 1] = '';
        setDigits(next);
        focusBox(i - 1);
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) focusBox(i - 1);
    if (e.key === 'ArrowRight' && i < 5) focusBox(i + 1);
    if (e.key === 'Enter' && otp.length === 6) verify();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const nums = text.replace(/\D/g, '').slice(0, 6).split('');
    if (!nums.length) return;
    const next = Array(6).fill('');
    nums.forEach((d, i) => { next[i] = d; });
    setDigits(next);
    setError('');
    if (nums.length === 6) inputsRef.current[5]?.blur();
    else focusBox(nums.length);
  };

  const verify = async () => {
    if (otp.length !== 6 || verifying) return;
    setVerifying(true);
    setError('');
    try {
      await axios.post(
        `${API_BASE_URL}/auth/verify-email-otp`,
        { email, otp },
        { withCredentials: true },
      );
      dispatch(setUser({ ...user, isEmailVerified: true }));
      setVerified(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect verification code');
      setDigits(Array(6).fill(''));
      setShake((s) => s + 1);
      focusBox(0);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (verified) {
      const t = setTimeout(() => navigate('/dashboard', { replace: true }), 1600);
      return () => clearTimeout(t);
    }
  }, [verified, navigate]);

  const mm = String(Math.floor(Math.max(expiry, 0) / 60)).padStart(2, '0');
  const ss = String(Math.max(expiry, 0) % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-900/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary-900/5 blur-3xl"
      />


      <button
        onClick={logout}
        className="absolute top-5 right-5 flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-100"
      >
        <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
        Log out
      </button>

      <motion.div className="w-full max-w-md" {...fadeUp} transition={{ duration: 0.4 }}>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-900 rounded-xl mb-4 shadow-lg shadow-primary-900/10">
            <span className="text-white font-heading font-bold text-xl">R</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-primary-900">Rudhram</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Manage your business, grow your revenue.</p>
        </div>

        <motion.div
          className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm"
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          {verified ? (
            <div className="flex flex-col items-center py-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
              >
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </svg>
              </motion.div>
              <h2 className="font-heading text-lg font-semibold text-primary-900">Email verified</h2>
              <p className="text-zinc-500 text-sm mt-1.5">Taking you to your dashboard…</p>
            </div>
          ) : (
            <>

              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
                  className="w-14 h-14 rounded-2xl bg-primary-900 text-white flex items-center justify-center mb-4 shadow-lg shadow-primary-900/15"
                >
                  <Mail className="w-6 h-6" strokeWidth={1.75} />
                </motion.div>
                <h2 className="font-heading text-lg font-semibold text-primary-900">Verify your email</h2>
                <p className="text-zinc-500 text-sm mt-1.5 leading-relaxed max-w-xs">
                  We sent a 6-digit code to <span className="font-medium text-primary-900">{email}</span>.
                  Enter it below to unlock all features.
                </p>
              </div>


              <motion.div
                key={shake}
                animate={shake ? { x: [0, -9, 9, -7, 7, -3, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-2.5 mt-7"
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${i + 1}`}
                    className={cn(
                      'w-11 h-13 h-14 text-center text-lg font-semibold text-primary-900 bg-zinc-50 border rounded-xl outline-none transition-all duration-150',
                      'placeholder:text-zinc-300 focus:bg-white',
                      error
                        ? 'border-red-300 text-red-600 focus:ring-1 focus:ring-red-500 focus:border-red-500'
                        : 'border-zinc-200 focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
                    )}
                  />
                ))}
              </motion.div>


              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-red-600 mt-3"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}


              <button
                onClick={verify}
                disabled={otp.length !== 6 || verifying}
                className={cn(
                  'w-full mt-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                  otp.length !== 6 || verifying
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-primary-900 text-white hover:bg-primary-800 active:scale-[0.99] shadow-lg shadow-primary-900/15',
                )}
              >
                {verifying ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  'Verify email'
                )}
              </button>


              <div className="flex items-center justify-between mt-6 pt-5 border-t border-zinc-100">
                <p className={cn('text-xs tabular-nums', expiry <= 30 ? 'text-amber-600 font-medium' : 'text-zinc-400')}>
                  <ShieldCheck className="inline w-3.5 h-3.5 mr-1 -mt-0.5" strokeWidth={1.5} />
                  Code expires in {mm}:{ss}
                </p>
                {cooldown > 0 ? (
                  <p className="text-xs text-zinc-400 tabular-nums">Resend in 0:{String(cooldown).padStart(2, '0')}</p>
                ) : (
                  <button
                    onClick={resendCode}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary-900 hover:text-primary-700 transition-colors"
                  >
                    <RefreshCwIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Resend code
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          Didn&apos;t receive it? Check your spam folder, or request a new code above.
        </p>
      </motion.div>
    </div>
  );
}
