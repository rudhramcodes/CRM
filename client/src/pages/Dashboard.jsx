import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../app/store/uiSlice';
import { Users, UserCheck, FolderKanban, CreditCard, Clock, AlertCircle, Mail } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

const statCards = [
  { label: 'Total Leads', value: '0', icon: Users },
  { label: 'Active Clients', value: '0', icon: UserCheck },
  { label: 'Running Projects', value: '0', icon: FolderKanban },
  { label: 'Revenue This Month', value: '\u20B90', icon: CreditCard },
  { label: 'Pending Payments', value: '\u20B90', icon: Clock },
  { label: 'Overdue Invoices', value: '0', icon: AlertCircle },
];

export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [verifySent, setVerifySent] = useState(false);

  useEffect(() => {
    dispatch(setPageTitle('Dashboard'));
  }, [dispatch]);

  const resendVerification = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/resend-verification`,
        { email: user?.email },
        { withCredentials: true },
      );
      setVerifySent(true);
    } catch {
      // Silently handle
    }
  };

  return (
    <div className="space-y-6">
      {user && !user.isEmailVerified && (
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
            <p className="text-sm text-amber-800">
              Please verify your email address to access all features.
            </p>
          </div>
          <button
            onClick={resendVerification}
            disabled={verifySent}
            className="text-sm font-medium text-amber-700 hover:text-amber-800 disabled:text-amber-400 transition-colors whitespace-nowrap"
          >
            {verifySent ? 'Sent' : 'Resend'}
          </button>
        </div>
      )}

      <div>
        <h2 className="font-heading text-xl font-semibold text-primary-900">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {card.label}
              </span>
              <card.icon className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
            </div>
            <p className="font-heading text-2xl font-semibold text-primary-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-heading text-sm font-semibold text-primary-900">
            Recent Activity
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-zinc-500">No recent activity</p>
          <p className="text-xs text-zinc-400 mt-1">
            Activity will appear once you start using Rudhram CRM.
          </p>
        </div>
      </div>
    </div>
  );
}
