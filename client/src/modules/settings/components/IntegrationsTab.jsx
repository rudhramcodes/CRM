import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Save, Video, Plug, Unplug } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import {
  useGetIntegrationSettingsQuery,
  useUpdateIntegrationSettingsMutation,
  useGetGoogleAuthUrlMutation,
  useDisconnectGoogleMutation,
} from '../../../services/settingsApi';

export default function IntegrationsTab() {
  const { data: settings, isLoading, refetch } = useGetIntegrationSettingsQuery();
  const [updateIntegration, { isLoading: isSaving }] = useUpdateIntegrationSettingsMutation();
  const [getAuthUrl] = useGetGoogleAuthUrlMutation();
  const [disconnectGoogle, { isLoading: isDisconnecting }] = useDisconnectGoogleMutation();
  const [form, setForm] = useState({
    resendFromEmail: '',
    resendFromName: '',
    googleClientId: '',
    googleClientSecret: '',
    googleCalendarId: '',
  });

  useEffect(() => {
    if (settings) setForm((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  // After the OAuth popup closes, refresh to pick up the new connected state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      toast.success('Google Calendar connected');
      refetch();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('google') === 'error') {
      toast.error('Google connection failed — check client ID/secret');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetch]);

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

  const handleConnect = async () => {
    try {
      const url = await getAuthUrl().unwrap();
      if (!url) { toast.error('Add Client ID and Secret first'); return; }
      const popup = window.open(url, 'google-oauth', 'width=520,height=640');
      const timer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(timer);
          refetch();
        }
      }, 500);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to start Google connection');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogle().unwrap();
      toast.success('Google Calendar disconnected');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to disconnect');
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
              className={inputClass} placeholder="Rudhram" />
          </div>
        </div>
      </div>

      {/* Google Meet — OAuth 2.0 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Video className="w-4 h-4" /> Google Meet — Auto-Generated Meeting Links
        </h3>

        <div className="flex items-center gap-3 mb-4">
          {settings?.googleConnected ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <XCircle className="w-4 h-4" /> Not Connected
            </span>
          )}
          {settings?.googleConnected && (
            <Button variant="secondary" size="sm" onClick={handleDisconnect} loading={isDisconnecting}>
              <Unplug className="w-3.5 h-3.5" /> Disconnect
            </Button>
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          Create an OAuth Client ID (Web application) in Google Cloud, then paste the credentials below and click
          <strong> Connect Google Calendar</strong>. New meetings will auto-generate a Google Meet link.
        </p>

        <div className="grid grid-cols-1 gap-4 max-w-lg mb-4">
          <div>
            <label className={labelClass}>OAuth Client ID</label>
            <input type="text" value={form.googleClientId}
              onChange={(e) => setForm((p) => ({ ...p, googleClientId: e.target.value }))}
              className={inputClass} placeholder="1234567890-abc.apps.googleusercontent.com" />
          </div>
          <div>
            <label className={labelClass}>OAuth Client Secret</label>
            <input type="password" value={form.googleClientSecret}
              onChange={(e) => setForm((p) => ({ ...p, googleClientSecret: e.target.value }))}
              className={inputClass} placeholder="GOCSPX-..." />
          </div>
          <div>
            <label className={labelClass}>Calendar ID (optional)</label>
            <input type="text" value={form.googleCalendarId}
              onChange={(e) => setForm((p) => ({ ...p, googleCalendarId: e.target.value }))}
              className={inputClass} placeholder="defaults to primary" />
          </div>
        </div>

        <Button onClick={handleConnect} variant="secondary">
          <Plug className="w-3.5 h-3.5" /> Connect Google Calendar
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isSaving}>
          <Save className="w-3.5 h-3.5" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
