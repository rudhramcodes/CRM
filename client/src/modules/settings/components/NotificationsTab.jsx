import { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, Loader, Volume2, VolumeX } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { useGetNotifPrefsQuery, useUpdateNotifPrefsMutation } from '../../../services/settingsApi';
import { isNotificationSoundEnabled, playNotificationSound, setNotificationSoundEnabled } from '../../../utils/notificationSound';

const NOTIF_TYPES = [
  { id: 'task_assigned', label: 'Task Assigned' },
  { id: 'task_status_change', label: 'Task Status Change' },
  { id: 'task_comment', label: 'Task Comment' },
  { id: 'mention', label: 'Mentions' },
  { id: 'project_assigned', label: 'Project Assigned' },
  { id: 'lead_created', label: 'New Lead' },
  { id: 'lead_assigned', label: 'Lead Assigned' },
  { id: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { id: 'meeting_reminder', label: 'Meeting Reminder' },
  { id: 'invoice_paid', label: 'Invoice Paid' },
  { id: 'invoice_overdue', label: 'Invoice Overdue' },
  { id: 'payment_received', label: 'Payment Received' },
];

const CHANNELS = [
  { id: 'inApp', label: 'In-App', icon: Smartphone },
  { id: 'email', label: 'Email', icon: Mail },
];

export default function NotificationsTab() {
  const { data: prefs, isLoading } = useGetNotifPrefsQuery();
  const [updateNotifPrefs, { isLoading: isSaving }] = useUpdateNotifPrefsMutation();
  const [local, setLocal] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled());

  useEffect(() => {
    if (prefs?.notify) {
      // Convert Map-like object to plain object
      const notify = typeof prefs.notify.toObject === 'function'
        ? Object.fromEntries(prefs.notify)
        : prefs.notify;
      setLocal(notify);
    }
  }, [prefs]);

  const toggle = (type, channel) => {
    setLocal((prev) => {
      const current = prev[type] || { inApp: true, email: false };
      return {
        ...prev,
        [type]: { ...current, [channel]: !current[channel] },
      };
    });
  };

  const handleSave = async () => {
    try {
      await updateNotifPrefs(local).unwrap();
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader className="w-5 h-5 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <h3 className="text-sm font-semibold text-primary-900 mb-1 flex items-center gap-2">
        <Bell className="w-4 h-4" /> Notification Preferences
      </h3>
      <p className="text-xs text-zinc-500 mb-4">Choose how you receive each type of notification.</p>

      <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-[#DCC19D] bg-[#F6F0DF]/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-[#B3712D] shadow-sm">
            {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
          </div>
          <div>
            <p className="text-sm font-medium text-[#3A2415]">Notification sound</p>
            <p className="mt-0.5 text-xs text-[#3A2415]/65">Play a subtle chime when a new in-app notification arrives.</p>
            <button type="button" onClick={playNotificationSound} disabled={!soundEnabled} className="mt-2 text-xs font-medium text-[#B3712D] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40">Test sound</button>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Notification sound"
          aria-checked={soundEnabled}
          onClick={() => { const next = !soundEnabled; setSoundEnabled(next); setNotificationSoundEnabled(next); }}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3712D]/40 ${soundEnabled ? 'bg-[#B3712D]' : 'bg-zinc-300'}`}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left py-2 pr-4 text-xs text-zinc-400 uppercase tracking-wide font-medium">Type</th>
              {CHANNELS.map((ch) => (
                <th key={ch.id} className="text-center py-2 px-3 text-xs text-zinc-400 uppercase tracking-wide font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <ch.icon className="w-3.5 h-3.5" /> {ch.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {NOTIF_TYPES.map((nt) => {
              const channels = local[nt.id] || { inApp: true, email: false };
              return (
                <tr key={nt.id} className="hover:bg-zinc-50">
                  <td className="py-2.5 pr-4 text-zinc-700">{nt.label}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.id} className="text-center py-2.5 px-3">
                      <button
                        type="button"
                        role="switch"
                        aria-label={`${nt.label} ${ch.label} notifications`}
                        aria-checked={channels[ch.id]}
                        onClick={() => toggle(nt.id, ch.id)}
                        className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-900/30 ${
                          channels[ch.id] ? 'bg-[#3A2415]' : 'bg-zinc-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                          channels[ch.id] ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-end">
        <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
          <Bell className="w-3.5 h-3.5" /> Save Preferences
        </Button>
      </div>
    </div>
  );
}
