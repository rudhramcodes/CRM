import { useState, useEffect } from 'react';
import { Mail, Server, Key, User, Eye, EyeOff, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { useGetIntegrationSettingsQuery, useUpdateIntegrationSettingsMutation } from '../../../services/settingsApi';

export default function IntegrationsTab() {
  const { data: settings, isLoading } = useGetIntegrationSettingsQuery();
  const [updateIntegration, { isLoading: isSaving }] = useUpdateIntegrationSettingsMutation();
  const [form, setForm] = useState({
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '',
    smtpSenderName: '', smtpSenderEmail: '',
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (settings) setForm((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      const data = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== settings?.[k]) data[k] = v;
      }
      if (!Object.keys(data).length) { toast.error('No changes'); return; }
      await updateIntegration(data).unwrap();
      toast.success('Integration settings saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  if (isLoading) return <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>;

  const labelClass = 'block text-xs text-zinc-400 uppercase tracking-wide mb-1';
  const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900';

  return (
    <div className="space-y-6">
      {/* SMTP Configuration */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4" /> SMTP Configuration
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Leaves fields empty to fall back to environment variables.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="col-span-2">
            <label className={labelClass}><Server className="w-3 h-3 inline mr-1" />SMTP Host</label>
            <input type="text" value={form.smtpHost}
              onChange={(e) => handleChange('smtpHost', e.target.value)}
              className={inputClass} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className={labelClass}>Port</label>
            <input type="number" value={form.smtpPort}
              onChange={(e) => handleChange('smtpPort', Number(e.target.value))}
              className={inputClass} placeholder="587" />
          </div>
          <div />
          <div>
            <label className={labelClass}><User className="w-3 h-3 inline mr-1" />Username</label>
            <input type="text" value={form.smtpUser}
              onChange={(e) => handleChange('smtpUser', e.target.value)}
              className={inputClass} placeholder="user@gmail.com" />
          </div>
          <div>
            <label className={labelClass}><Key className="w-3 h-3 inline mr-1" />Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.smtpPass}
                onChange={(e) => handleChange('smtpPass', e.target.value)}
                className={`${inputClass} pr-8`} placeholder="App password" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Sender Name</label>
            <input type="text" value={form.smtpSenderName}
              onChange={(e) => handleChange('smtpSenderName', e.target.value)}
              className={inputClass} placeholder="Rudhram CRM" />
          </div>
          <div>
            <label className={labelClass}>Sender Email</label>
            <input type="email" value={form.smtpSenderEmail}
              onChange={(e) => handleChange('smtpSenderEmail', e.target.value)}
              className={inputClass} placeholder="noreply@rudhram.com" />
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
