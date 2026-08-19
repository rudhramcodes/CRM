import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Lock, Eye, EyeOff, Building2, User, Mail, Phone } from 'lucide-react';
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
      toast.success('Password changed');
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
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary-900/5 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary-900" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-primary-900 font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );

  const passwordFields = [
    { key: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
    { key: 'newPassword', label: 'New Password', placeholder: 'Enter new password' },
    { key: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-primary-900">Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Your account and contact details.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-primary-900 mb-5 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Contact Information
          </h2>
          <div className="space-y-4">
            {infoRow(Building2, 'Company', client.companyName)}
            {infoRow(User, 'Contact person', client.contactPerson)}
            {infoRow(Mail, 'Email', client.email)}
            {infoRow(Phone, 'Phone', client.phone)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-sm font-semibold text-primary-900 mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </h2>
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
                  className="pr-9"
                  placeholder={field.placeholder}
                  error={passwordErrors[field.key]}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => ({ ...p, [field.key]: !p[field.key] }))}
                  className="absolute right-2.5 top-[38px] text-zinc-400 hover:text-zinc-600"
                  aria-label={showPwd[field.key] ? 'Hide password' : 'Show password'}
                >
                  {showPwd[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ))}
            <Button type="submit" loading={isChanging} disabled={isChanging}>
              <Lock className="w-3.5 h-3.5" /> Change Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}