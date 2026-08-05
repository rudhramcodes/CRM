import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Save, Plug, Unplug, CalendarClock, AlertTriangle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  useGetIntegrationSettingsQuery,
  useUpdateIntegrationSettingsMutation,
  useGetZohoAuthUrlMutation,
  useDisconnectZohoMutation,
} from '../../../services/settingsApi';

export default function IntegrationsTab() {
  const { data: settings, isLoading, refetch } = useGetIntegrationSettingsQuery();
  const [updateIntegration, { isLoading: isSaving }] = useUpdateIntegrationSettingsMutation();
  const [getZohoAuthUrl] = useGetZohoAuthUrlMutation();
  const [disconnectZoho, { isLoading: isDisconnectingZoho }] = useDisconnectZohoMutation();
  const [form, setForm] = useState({
    resendFromEmail: '',
    resendFromName: '',
    zohoClientId: '',
    zohoClientSecret: '',
    zohoOrgName: '',
  });
  const [pendingChanges, setPendingChanges] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (settings) setForm((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  // After the OAuth popup closes, refresh to pick up the new connected state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('zoho') === 'connected') {
      toast.success('Zoho Meetings connected');
      refetch();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('zoho') === 'error') {
      toast.error('Zoho connection failed — check client ID/secret');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetch]);

  const getChangedData = () => {
    const data = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== settings?.[k]) data[k] = v;
    }
    return data;
  };

  const handleSaveClick = () => {
    const data = getChangedData();
    if (!Object.keys(data).length) { toast.error('No changes'); return; }
    setPendingChanges(data);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    try {
      await updateIntegration(pendingChanges).unwrap();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    } finally {
      setPendingChanges(null);
    }
  };

  const handleConnectZoho = async () => {
    try {
      const url = await getZohoAuthUrl().unwrap();
      if (!url) { toast.error('Add Zoho Client ID and Secret first'); return; }
      const popup = window.open(url, 'zoho-oauth', 'width=520,height=640');
      const timer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(timer);
          refetch();
        }
      }, 500);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to start Zoho connection');
    }
  };

  const handleDisconnectZoho = async () => {
    try {
      await disconnectZoho().unwrap();
      toast.success('Zoho Meetings disconnected');
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

      {/* Zoho Meetings — OAuth 2.0 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Zoho Meetings — Auto-Generated Meeting Links
        </h3>

        <div className="flex items-center gap-3 mb-4">
          {settings?.zohoConnected ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <XCircle className="w-4 h-4" /> Not Connected
            </span>
          )}
          {settings?.zohoConnected && (
            <Button variant="secondary" size="sm" onClick={handleDisconnectZoho} loading={isDisconnectingZoho}>
              <Unplug className="w-3.5 h-3.5" /> Disconnect
            </Button>
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          Create a Server-based client in Zoho API Console, then paste the credentials below and click
          <strong> Connect Zoho Meetings</strong>. New meetings will auto-generate a Zoho Meeting link.
        </p>

        <div className="grid grid-cols-1 gap-4 max-w-lg mb-4">
          <div>
            <label className={labelClass}>Zoho Client ID</label>
            <input type="text" value={form.zohoClientId}
              onChange={(e) => setForm((p) => ({ ...p, zohoClientId: e.target.value }))}
              className={inputClass} placeholder="1000.XXXXXXXXXXXX" />
            <p className="text-[11px] text-zinc-400 mt-1">Loaded from server env if not saved locally.</p>
          </div>
          <div>
            <label className={labelClass}>Zoho Client Secret</label>
            <input type="password" value={form.zohoClientSecret}
              onChange={(e) => setForm((p) => ({ ...p, zohoClientSecret: e.target.value }))}
              className={inputClass} placeholder="Client secret" />
            <p className="text-[11px] text-zinc-400 mt-1">Loaded from server env if not saved locally.</p>
          </div>
          <div>
            <label className={labelClass}>Organization Name (X-ZSOURCE)</label>
            <input type="text" value={form.zohoOrgName}
              onChange={(e) => setForm((p) => ({ ...p, zohoOrgName: e.target.value }))}
              className={inputClass} placeholder="Rudhram CRM" />
          </div>
        </div>

        <Button onClick={handleConnectZoho} variant="secondary">
          <Plug className="w-3.5 h-3.5" /> Connect Zoho Meetings
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveClick} loading={isSaving}>
          <Save className="w-3.5 h-3.5" /> Save Settings
        </Button>
      </div>

      {/* Confirm before editing integration credentials */}
      <Modal open={showConfirm} onClose={() => { setShowConfirm(false); setPendingChanges(null); }} title="Confirm Changes" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-zinc-700">
              Are you sure you want to edit the integration settings? Changing these credentials can break the
              meeting link service for everyone.
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>Please take permission from the developer first.</strong> Wrong credentials or an incomplete
            setup can crash the meeting link generation and meetings will be created without links.
          </div>

          <div className="text-xs text-zinc-500">
            Changed fields: <span className="font-medium text-zinc-700">{Object.keys(pendingChanges || {}).join(', ')}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setShowConfirm(false); setPendingChanges(null); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} loading={isSaving}>
              Yes, Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
