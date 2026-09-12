import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Lock, Eye, EyeOff, Building2, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useGetClientMeQuery } from '../../../services/clientApi';
import { useChangePasswordMutation } from '../../../services/settingsApi';

export default function PortalProfile() {
  const { user } = useSelector((state) => state.auth);
  const { data: me } = useGetClientMeQuery(undefined, { skip: user?.role !== 'client' });
  const client = me?.data?.client || {};

  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation();

  const validate = () => {
    const errors = {};
    if (!password.currentPassword) errors.currentPassword = 'Current password is required';
    if (!password.newPassword) errors.newPassword = 'New password is required';
    else if (password.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
    if (!password.confirmPassword) errors.confirmPassword = 'Please confirm your new password';
    else if (password.newPassword !== password.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    if (!validate()) return;
    try {
      await changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword }).unwrap();
      toast.success('Password updated successfully');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err?.data?.message || 'Failed to change password';
      if (err?.data?.errors) {
        const apiErrors = {};
        for (const er of err.data.errors) apiErrors[er.field] = er.message;
        setPasswordErrors(apiErrors);
      }
      toast.error(msg);
    }
  };

  const infoRow = (Icon, label, value) => (
    <div className="flex items-start gap-3.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
      <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0 text-primary-900">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-zinc-900 font-semibold truncate mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );

  const passwordFields = [
    { key: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
    { key: 'newPassword', label: 'New Password', placeholder: 'Min. 8 characters' },
    { key: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary-900 font-semibold">
          Identity & Access
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 font-heading mt-1">
          Account Profile
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Manage your enterprise credentials, contact profile, and security preferences.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-900 font-heading flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-900" /> Enterprise Profile
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3 h-3" /> Active
            </span>
          </div>

          <div className="space-y-3">
            {infoRow(Building2, 'Company Name', client.companyName)}
            {infoRow(User, 'Executive Contact', client.contactPerson)}
            {infoRow(Mail, 'Primary Portal Email', client.email)}
            {infoRow(Phone, 'Direct Phone', client.phone)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5">
          <div className="pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-900 font-heading flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-900" /> Security & Password
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Change your secret password to keep your portal secure.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {passwordFields.map((field) => (
              <div key={field.key} className="relative">
                <Input
                  type={showPwd[field.key] ? 'text' : 'password'}
                  label={field.label}
                  value={password[field.key]}
                  onChange={(e) => {
                    setPassword((p) => ({ ...p, [field.key]: e.target.value }));
                    setPasswordErrors((p) => ({ ...p, [field.key]: '' }));
                  }}
                  className="pr-9 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-primary-900 focus:ring-primary-900"
                  placeholder={field.placeholder}
                  error={passwordErrors[field.key]}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => ({ ...p, [field.key]: !p[field.key] }))}
                  className="absolute right-3 top-[38px] text-zinc-400 hover:text-zinc-600"
                  aria-label={showPwd[field.key] ? 'Hide password' : 'Show password'}
                >
                  {showPwd[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ))}
            <div className="pt-2">
              <Button
                type="submit"
                loading={isChanging}
                disabled={isChanging}
                className="bg-primary-900 hover:bg-primary-800 text-white font-medium shadow-xs border-0"
              >
                <Lock className="w-3.5 h-3.5" /> Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}