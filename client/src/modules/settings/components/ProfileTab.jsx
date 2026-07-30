import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { setUser } from '../../../app/store/authSlice';
import { useUpdateProfileMutation, useChangePasswordMutation } from '../../../services/settingsApi';

export default function ProfileTab() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  useEffect(() => {
    if (user) setProfile({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  }, [user]);

  const validateProfile = () => {
    const errors = {};
    if (!profile.name?.trim()) errors.name = 'Name is required';
    if (!profile.email?.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(profile.email)) errors.email = 'Invalid email format';
    if (profile.phone && !/^[\d\s+\-()]{7,20}$/.test(profile.phone)) errors.phone = 'Invalid phone number';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};
    if (!password.currentPassword) errors.currentPassword = 'Current password is required';
    if (!password.newPassword) errors.newPassword = 'New password is required';
    else if (password.newPassword.length < 6) errors.newPassword = 'Password must be at least 6 characters';
    if (!password.confirmPassword) errors.confirmPassword = 'Please confirm your new password';
    else if (password.newPassword !== password.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});
    if (!validateProfile()) return;
    const data = {};
    if (profile.name !== user.name) data.name = profile.name;
    if (profile.email !== user.email) data.email = profile.email;
    if (profile.phone !== (user.phone || '')) data.phone = profile.phone;
    if (!Object.keys(data).length) { toast.error('No changes to save'); return; }
    try {
      const res = await updateProfile(data).unwrap();
      dispatch(setUser(res.data?.user || res.user));
      toast.success('Profile updated');
    } catch (err) {
      const msg = err?.data?.message || 'Failed to update profile';
      if (err?.data?.errors) {
        const apiErrors = {};
        for (const er of err.data.errors) apiErrors[er.field] = er.message;
        setProfileErrors(apiErrors);
      }
      toast.error(msg);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    if (!validatePassword()) return;
    try {
      await changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword }).unwrap();
      toast.success('Password changed');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
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

  const inputClass = (hasError) =>
    `w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
      hasError
        ? 'border-red-300 bg-red-50 focus:ring-red-400 focus:border-red-400'
        : 'border-zinc-200 focus:ring-primary-900'
    }`;

  const pwdInputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
      hasError
        ? 'border-red-300 bg-red-50 focus:ring-red-400 focus:border-red-400'
        : 'border-zinc-200 focus:ring-primary-900'
    }`;

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Profile Information
        </h3>
        <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="text" value={profile.name}
                onChange={(e) => { setProfile((p) => ({ ...p, name: e.target.value })); setProfileErrors((p) => ({ ...p, name: '' })); }}
                className={inputClass(profileErrors.name)} placeholder="John Doe" />
            </div>
            {profileErrors.name && <p className="text-xs text-red-500 mt-1">{profileErrors.name}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="email" value={profile.email}
                onChange={(e) => { setProfile((p) => ({ ...p, email: e.target.value })); setProfileErrors((p) => ({ ...p, email: '' })); }}
                className={inputClass(profileErrors.email)} placeholder="john@company.com" />
            </div>
            {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="tel" inputMode="numeric" value={profile.phone}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9+]/g, ''); setProfile((p) => ({ ...p, phone: v })); setProfileErrors((p) => ({ ...p, phone: '' })); }}
                className={inputClass(profileErrors.phone)} placeholder="+91 98765 43210" />
            </div>
            {profileErrors.phone && <p className="text-xs text-red-500 mt-1">{profileErrors.phone}</p>}
          </div>
          <Button type="submit" loading={isUpdating} disabled={isUpdating}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Change Password
        </h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Current Password</label>
            <div className="relative">
              <input type={showPwd.current ? 'text' : 'password'} value={password.currentPassword}
                onChange={(e) => { setPassword((p) => ({ ...p, currentPassword: e.target.value })); setPasswordErrors((p) => ({ ...p, currentPassword: '' })); }}
                className={`${pwdInputClass(passwordErrors.currentPassword)} pr-9`} placeholder="Enter current password" />
              <button type="button" onClick={() => setShowPwd((p) => ({ ...p, current: !p.current }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">New Password</label>
            <div className="relative">
              <input type={showPwd.new ? 'text' : 'password'} value={password.newPassword}
                onChange={(e) => { setPassword((p) => ({ ...p, newPassword: e.target.value })); setPasswordErrors((p) => ({ ...p, newPassword: '' })); }}
                className={`${pwdInputClass(passwordErrors.newPassword)} pr-9`} placeholder="Enter new password" />
              <button type="button" onClick={() => setShowPwd((p) => ({ ...p, new: !p.new }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>}
            {password.newPassword && (
              <div className="mt-2 space-y-1">
                <PasswordCheck label="At least 8 characters" met={password.newPassword.length >= 8} />
                <PasswordCheck label="One uppercase letter" met={/[A-Z]/.test(password.newPassword)} />
                <PasswordCheck label="One lowercase letter" met={/[a-z]/.test(password.newPassword)} />
                <PasswordCheck label="One number" met={/[0-9]/.test(password.newPassword)} />
                <PasswordCheck label="One special character" met={/[^A-Za-z0-9]/.test(password.newPassword)} />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Confirm New Password</label>
            <div className="relative">
              <input type={showPwd.confirm ? 'text' : 'password'} value={password.confirmPassword}
                onChange={(e) => { setPassword((p) => ({ ...p, confirmPassword: e.target.value })); setPasswordErrors((p) => ({ ...p, confirmPassword: '' })); }}
                className={`${pwdInputClass(passwordErrors.confirmPassword)} pr-9`} placeholder="Re-enter new password" />
              <button type="button" onClick={() => setShowPwd((p) => ({ ...p, confirm: !p.confirm }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPwd.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword}</p>}
          </div>
          <Button type="submit" loading={isChangingPassword} disabled={isChangingPassword}>
            <Lock className="w-3.5 h-3.5" /> Change Password
          </Button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-2">Account Details</h3>
        <div className="space-y-1 text-sm text-zinc-600">
          <p>Role: <span className="font-medium capitalize text-zinc-800">{user?.role?.replace('_', ' ')}</span></p>
          <p>Email verified: <span className={`font-medium ${user?.isEmailVerified ? 'text-green-600' : 'text-amber-600'}`}>
            {user?.isEmailVerified ? 'Yes' : 'No'}
          </span></p>
          <p>Member since: <span className="font-medium text-zinc-800">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
          </span></p>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ label, met }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
        met ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-300 text-zinc-300'
      }`}>
        {met && <svg className="w-2 h-2" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="3"><path d="M2 6l3 3 5-5" /></svg>}
      </span>
      <span className={met ? 'text-green-700' : 'text-zinc-400'}>{label}</span>
    </div>
  );
}
