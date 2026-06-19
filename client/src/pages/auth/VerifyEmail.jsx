import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../constants';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    const verify = async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/verify-email`,
          { token },
          { withCredentials: true },
        );
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="text-center">
      {status === 'verifying' && (
        <>
          <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Verifying your email...</h2>
          <p className="text-zinc-500 text-sm">Please wait while we verify your email address.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Email verified</h2>
          <p className="text-zinc-500 text-sm mb-6">{message}</p>
          <Link
            to="/auth/login"
            className="text-sm text-primary-900 hover:text-primary-800 font-medium transition-colors"
          >
            Sign in to your account
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-heading text-lg font-semibold text-primary-900 mb-3">Verification failed</h2>
          <p className="text-zinc-500 text-sm mb-6">{message}</p>
          <Link
            to="/auth/login"
            className="text-sm text-primary-900 hover:text-primary-800 font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
