import { useState, useEffect } from 'react';
import { Shield, Key, Lock, Eye, EyeOff, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { useGetSecuritySettingsQuery, useUpdateSecuritySettingsMutation } from '../../../services/settingsApi';

export default function SecurityTab() {
  const { data: settings, isLoading } = useGetSecuritySettingsQuery();
  const [updateSecurity, { isLoading: isSaving }] = useUpdateSecuritySettingsMutation();
  const [form, setForm] = useState({
    passwordMinLength: 8,
    passwordRequireUpper: true,
    passwordRequireLower: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,
    loginMaxAttempts: 5,
    loginLockoutMinutes: 15,
  });

  useEffect(() => {
    if (settings) setForm((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const toggle = (key) => setForm((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    try {
      const data = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== settings?.[k]) data[k] = v;
      }
      if (!Object.keys(data).length) { toast.error('No changes'); return; }
      await updateSecurity(data).unwrap();
      toast.success('Security settings saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  if (isLoading) return <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>;

  const labelClass = 'block text-xs text-zinc-400 uppercase tracking-wide mb-1';
  const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900';

  return (
    <div className="space-y-6">
      {/* Password Policy */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" /> Password Policy
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className={labelClass}>Minimum Length</label>
            <input type="number" min={4} max={128} value={form.passwordMinLength}
              onChange={(e) => setForm((p) => ({ ...p, passwordMinLength: Number(e.target.value) }))}
              className={inputClass} />
          </div>
          <div />
          <ToggleRow label="Require Uppercase (A-Z)" checked={form.passwordRequireUpper} onChange={() => toggle('passwordRequireUpper')} />
          <ToggleRow label="Require Lowercase (a-z)" checked={form.passwordRequireLower} onChange={() => toggle('passwordRequireLower')} />
          <ToggleRow label="Require Number (0-9)" checked={form.passwordRequireNumber} onChange={() => toggle('passwordRequireNumber')} />
          <ToggleRow label="Require Special Character" checked={form.passwordRequireSpecial} onChange={() => toggle('passwordRequireSpecial')} />
        </div>
      </div>

      {/* Login Lockout */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Login Lockout
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className={labelClass}>Max Login Attempts</label>
            <input type="number" min={1} max={100} value={form.loginMaxAttempts}
              onChange={(e) => setForm((p) => ({ ...p, loginMaxAttempts: Number(e.target.value) }))}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Lockout Duration (minutes)</label>
            <input type="number" min={1} max={1440} value={form.loginLockoutMinutes}
              onChange={(e) => setForm((p) => ({ ...p, loginLockoutMinutes: Number(e.target.value) }))}
              className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving}>
          <Save className="w-3.5 h-3.5" /> Save Settings
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 cursor-pointer">
      <span className="text-sm text-zinc-700">{label}</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-primary-900' : 'bg-zinc-300'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      </div>
    </label>
  );
}
