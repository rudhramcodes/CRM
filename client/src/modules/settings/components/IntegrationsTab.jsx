import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Save } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { useGetIntegrationSettingsQuery, useUpdateIntegrationSettingsMutation } from '../../../services/settingsApi';

export default function IntegrationsTab() {
  const { data: settings, isLoading } = useGetIntegrationSettingsQuery();
  const [updateIntegration, { isLoading: isSaving }] = useUpdateIntegrationSettingsMutation();
  const [form, setForm] = useState({ resendFromEmail: '', resendFromName: '' });

  useEffect(() => {
    if (settings) setForm((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const handleSave = async () => {
    try {
      const data = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== settings?.[k]) data[k] = v;
      }
      if (!Object.keys(data).length) { toast.error('No changes'); return; }
      await updateIntegration(data).unwrap();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  if (isLoading) return <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>;

  const labelClass = 'block text-xs text-zinc-400 uppercase tracking-wide mb-1';
  const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900';

  return (
    <div className="space-y-6">
      {/* Resend Status */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Resend — Email Service
        </h3>

        <div className="flex items-center gap-2 mb-4">
          {settings?.resendConfigured ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <XCircle className="w-4 h-4" /> Not Connected
            </span>
          )}
        </div>

        {!settings?.resendConfigured && (
          <p className="text-xs text-zinc-500 mb-3">
            Add <code className="bg-zinc-100 px-1 rounded">RESEND_API_KEY</code> in Render Environment Variables to enable emails.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className={labelClass}>From Email</label>
            <input type="email" value={form.resendFromEmail}
              onChange={(e) => setForm((p) => ({ ...p, resendFromEmail: e.target.value }))}
              className={inputClass} placeholder="noreply@rudhramenterprises.com" />
          </div>
          <div>
            <label className={labelClass}>From Name</label>
            <input type="text" value={form.resendFromName}
              onChange={(e) => setForm((p) => ({ ...p, resendFromName: e.target.value }))}
              className={inputClass} placeholder="Rudhram CRM" />
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
