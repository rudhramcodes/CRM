import { useState, useEffect } from 'react';
import { Building2, Globe, Clock, CalendarDays, Currency, Save, MapPin, Languages } from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { useGetOrgSettingsQuery, useUpdateOrgSettingsMutation } from '../../../services/settingsApi';

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Shanghai',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'AED', label: 'د.إ AED' },
  { value: 'SGD', label: 'S$ SGD' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' },
  { value: 'gu', label: 'ગુજરાતી' },
];

export default function OrganizationTab() {
  const { data: settings, isLoading } = useGetOrgSettingsQuery();
  const [updateOrgSettings, { isLoading: isSaving }] = useUpdateOrgSettingsMutation();
  const [form, setForm] = useState({
    companyName: '', logo: '', address: '',
    timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY',
    currency: 'INR', language: 'en',
  });

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
      await updateOrgSettings(data).unwrap();
      toast.success('Organization settings saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  if (isLoading) return <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>;

  const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900';
  const labelClass = 'block text-xs text-zinc-400 uppercase tracking-wide mb-1';

  return (
    <div className="space-y-6">
      {/* Branding */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Branding
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="col-span-2">
            <label className={labelClass}>Company Name</label>
            <input type="text" value={form.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className={inputClass} placeholder="Rudhram" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Logo URL</label>
            <input type="url" value={form.logo}
              onChange={(e) => handleChange('logo', e.target.value)}
              className={inputClass} placeholder="https://example.com/logo.png" />
            {form.logo && (
              <img src={form.logo} alt="logo preview" className="mt-2 h-10 rounded" />
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Address</label>
            <textarea value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className={`${inputClass} resize-none`} rows={3} placeholder="Company address" />
          </div>
        </div>
      </div>

      {/* Locale */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Locale
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className={labelClass}><Clock className="w-3 h-3 inline mr-1" />Timezone</label>
            <select value={form.timezone} onChange={(e) => handleChange('timezone', e.target.value)}
              className={inputClass}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}><CalendarDays className="w-3 h-3 inline mr-1" />Date Format</label>
            <select value={form.dateFormat} onChange={(e) => handleChange('dateFormat', e.target.value)}
              className={inputClass}>
              {DATE_FORMATS.map((df) => <option key={df.value} value={df.value}>{df.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}><Currency className="w-3 h-3 inline mr-1" />Currency</label>
            <select value={form.currency} onChange={(e) => handleChange('currency', e.target.value)}
              className={inputClass}>
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}><Languages className="w-3 h-3 inline mr-1" />Language</label>
            <select value={form.language} onChange={(e) => handleChange('language', e.target.value)}
              className={inputClass}>
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
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
