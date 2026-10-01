import { useMemo, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Loader2,
  CheckCircle2,
  Zap,
  Building2,
  User,
  Users,
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  Repeat,
  Sparkles,
  Search,
  Check,
  X,
  FileText
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import StartTimePicker from '../../../components/forms/StartTimePicker';
import DurationPicker from '../../../components/forms/DurationPicker';
import LinkInput from '../../../components/forms/LinkInput';
import Button from '../../../components/ui/Button';
import { MEETING_STATUS, LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import {
  useCreateMeetingMutation,
  useGenerateMeetingLinkMutation,
  useUpdateMeetingMutation,
} from '../../../services/meetingApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { useGetClientsQuery } from '../../../services/clientApi';
import { useGetLeadsQuery } from '../../../services/leadApi';

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const meetingFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    meetingLink: z.string().url('Invalid URL format').optional().or(z.literal('')),
    location: z.string().max(200).optional().or(z.literal('')),
    notes: z.string().max(5000).optional().or(z.literal('')),
    status: z.string().optional(),
    brand: z.string().optional().nullable(),
    client: z.string().optional().nullable(),
    lead: z.string().optional().nullable(),
    attendees: z.array(z.string()).default([]),
    recurrenceType: z.string().optional(),
    recurrenceOccurrences: z.coerce.number().int().min(2).max(100).optional(),
  })
  .refine(
    (data) => {
      const toMin = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const diff = (toMin(data.endTime) - toMin(data.startTime) + 24 * 60) % (24 * 60);
      return diff > 0;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

export default function MeetingForm({ meeting, onSuccess, onCancel, defaultClient, defaultLead }) {
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation();
  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation();
  const [generateMeetingLink, { isLoading: isGeneratingLink }] = useGenerateMeetingLinkMutation();

  const { data: usersData, isLoading: isUsersLoading } = useGetUsersQuery({ limit: 100 });
  const { data: clientsData, isLoading: isClientsLoading } = useGetClientsQuery({ limit: 100 });
  const { data: leadsData, isLoading: isLeadsLoading } = useGetLeadsQuery({ limit: 100 });

  const [attendeeSearch, setAttendeeSearch] = useState('');

  const isEditing = !!meeting;

  const users = useMemo(() => {
    const list = usersData?.data?.users || (Array.isArray(usersData?.data) ? usersData.data : []) || [];
    return [...list].sort((a, b) => {
      if (a.role === 'client' && b.role !== 'client') return 1;
      if (a.role !== 'client' && b.role === 'client') return -1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [usersData]);

  const clients = useMemo(() => {
    return clientsData?.data || (Array.isArray(clientsData) ? clientsData : []) || [];
  }, [clientsData]);

  const leads = useMemo(() => {
    return leadsData?.data || (Array.isArray(leadsData) ? leadsData : []) || [];
  }, [leadsData]);

  const formValues = useMemo(
    () =>
      meeting
        ? {
            title: meeting.title || '',
            date: meeting.date ? meeting.date.split('T')[0] : '',
            startTime: meeting.startTime || '',
            endTime: meeting.endTime || '',
            meetingLink: meeting.meetingLink || '',
            location: meeting.location || '',
            notes: meeting.notes || '',
            status: meeting.status || 'scheduled',
            brand: meeting.brand || '',
            client: meeting.client?._id || (typeof meeting.client === 'string' ? meeting.client : '') || defaultClient || '',
            lead: meeting.lead?._id || (typeof meeting.lead === 'string' ? meeting.lead : '') || defaultLead || '',
            attendees: (meeting.attendees || []).map((a) => a?._id || a),
            recurrenceType: 'none',
            recurrenceOccurrences: 3,
          }
        : {
            title: '',
            date: '',
            startTime: '',
            endTime: '',
            meetingLink: '',
            location: '',
            notes: '',
            status: 'scheduled',
            brand: '',
            client: defaultClient || '',
            lead: defaultLead || '',
            attendees: [],
            recurrenceType: 'none',
            recurrenceOccurrences: 3,
          },
    [meeting, defaultClient, defaultLead]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(meetingFormSchema),
    values: formValues,
  });

  const startTimeValue = watch('startTime');
  const selectedClientId = watch('client');
  const selectedBrand = watch('brand');
  const meetingLinkValue = watch('meetingLink');
  const recurrenceTypeValue = watch('recurrenceType');
  const prevStartTime = useRef(startTimeValue);

  const selectedClient = useMemo(
    () => clients.find((c) => c._id === selectedClientId),
    [clients, selectedClientId]
  );

  // Auto-fill venture / brand if client has brand and brand is empty
  useEffect(() => {
    if (selectedClient?.brand && !watch('brand')) {
      setValue('brand', selectedClient.brand);
    }
  }, [selectedClient, setValue, watch]);

  // If client is selected and has an associated user ID in users, auto-select in attendees if not already
  useEffect(() => {
    if (selectedClient) {
      const clientUser = users.find(
        (u) =>
          (selectedClient.user && u._id === selectedClient.user) ||
          (selectedClient.email && u.email?.toLowerCase() === selectedClient.email?.toLowerCase())
      );
      if (clientUser) {
        const currentAttendees = watch('attendees') || [];
        if (!currentAttendees.includes(clientUser._id)) {
          setValue('attendees', [...currentAttendees, clientUser._id]);
        }
      }
    }
  }, [selectedClient, users, setValue, watch]);

  useEffect(() => {
    if (prevStartTime.current && startTimeValue !== prevStartTime.current) {
      setValue('endTime', '', { shouldValidate: true });
    }
    prevStartTime.current = startTimeValue;
  }, [startTimeValue, setValue]);

  const onAutoGenerateGoogleMeetLink = () => {
    const link = import.meta.env.VITE_GOOGLE_MEET_DEFAULT_URL || 'https://meet.google.com/agw-dnrs-jfv';
    setValue('meetingLink', link, { shouldValidate: true });
    toast.success('Google Meet link applied!');
  };

  const onAutoGenerateZohoLink = async () => {
    const { title, date, startTime, endTime } = watch();
    if (!title || !date || !startTime || !endTime) {
      toast.error('Please fill in title, date and start/end time first');
      return;
    }
    try {
      const link = await generateMeetingLink({ title, date, startTime, endTime, provider: 'zoho' }).unwrap();
      setValue('meetingLink', link, { shouldValidate: true });
      toast.success('Zoho Meeting link generated & synced!');
    } catch (error) {
      toast.error(error?.data?.message || 'Could not auto-generate Zoho link');
    }
  };

  const isMeetLink = Boolean(meetingLinkValue && meetingLinkValue.includes('meet.google.com'));
  const isZohoLink = Boolean(meetingLinkValue && (meetingLinkValue.includes('zoho') || meetingLinkValue.includes('zohomeeting')));

  const filteredUsers = useMemo(() => {
    if (!attendeeSearch.trim()) return users;
    const q = attendeeSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, attendeeSearch]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title.trim(),
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        meetingLink: data.meetingLink?.trim() || undefined,
        location: data.location?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        status: data.status || 'scheduled',
        brand: data.brand || null,
        client: data.client || null,
        lead: data.lead || null,
        attendees: data.attendees || [],
      };

      if (!isEditing && data.recurrenceType && data.recurrenceType !== 'none') {
        payload.recurrence = {
          type: data.recurrenceType,
          interval: 1,
          occurrences: Number(data.recurrenceOccurrences) || 3,
        };
      }

      if (isEditing) {
        await updateMeeting({ id: meeting._id, ...payload }).unwrap();
        toast.success('Meeting updated successfully');
        onSuccess?.();
      } else {
        await createMeeting(payload).unwrap();
        toast.success('Meeting scheduled successfully');
        onSuccess?.();
      }
    } catch (error) {
      const msg = error?.data?.message || 'Something went wrong while saving the meeting';
      toast.error(msg);
    }
  };

  const brandMeta = selectedBrand ? BRAND_METAS[selectedBrand] : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 1. Header Overview Section */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-50 text-primary-900">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 font-display">
              {isEditing ? 'Edit Meeting Details' : 'New Session Scheduling'}
            </h3>
          </div>
          {brandMeta && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-xs font-medium text-zinc-700">
              {brandMeta.logo ? (
                <img src={brandMeta.logo} alt={brandMeta.label} className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-primary-900 text-white flex items-center justify-center text-[9px] font-bold">
                  {brandMeta.initial || 'V'}
                </span>
              )}
              <span>{brandMeta.label}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <FormInput
            label="Meeting Subject / Title *"
            placeholder="e.g. Creative Direction Review & Milestone Alignment"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Venture / Brand */}
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Venture / Brand
                  </label>
                  <select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all"
                  >
                    <option value="">No specific venture (Cross-entity)</option>
                    {LEAD_BRANDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />

            {/* Status */}
            <FormSelect
              name="status"
              control={control}
              label="Meeting Status"
              options={MEETING_STATUS}
              error={errors.status?.message}
            />
          </div>
        </div>
      </div>

      {/* 2. Client & Lead Linking Context */}
      <div className="rounded-2xl border border-zinc-200/80 bg-[#fbfbfa] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                Client / Lead Association
              </h4>
              <p className="text-[11px] text-zinc-500">Link session to a registered client or pipeline prospect</p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-400">Optional Context</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="client"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  Registered Client
                </label>
                <select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all"
                >
                  <option value="">No client selected</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName} {c.contactPerson ? `(${c.contactPerson})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          />

          <Controller
            name="lead"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  Lead Prospect
                </label>
                <select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all"
                >
                  <option value="">No lead prospect selected</option>
                  {leads.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name} {l.company ? `— ${l.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          />
        </div>

        {selectedClient && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-emerald-950">{selectedClient.companyName}</span>
                {selectedClient.contactPerson && (
                  <span className="text-emerald-800 font-medium">({selectedClient.contactPerson})</span>
                )}
                {selectedClient.email && (
                  <span className="text-emerald-700 font-mono text-[11px]">&lt;{selectedClient.email}&gt;</span>
                )}
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-0.5">
                Session automatically syncs to Client Portal timeline & calendar invites.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Schedule, Time & Recurrence */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
            <Clock className="w-4 h-4" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
            Timing & Schedule
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date *"
                value={field.value}
                onChange={field.onChange}
                error={errors.date?.message}
              />
            )}
          />

          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <StartTimePicker
                label="Start Time *"
                value={field.value}
                onChange={field.onChange}
                error={errors.startTime?.message}
              />
            )}
          />

          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <DurationPicker
                label="End Time *"
                value={field.value}
                onChange={field.onChange}
                error={errors.endTime?.message}
                startTime={startTimeValue}
              />
            )}
          />
        </div>

        {/* Recurrence Rule for new sessions */}
        {!isEditing && (
          <div className="pt-2 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              name="recurrenceType"
              control={control}
              label="Recurrence Series"
              options={REPEAT_OPTIONS}
              error={errors.recurrenceType?.message}
            />
            {recurrenceTypeValue !== 'none' && (
              <FormInput
                type="number"
                label="Total Repeat Occurrences"
                placeholder="3"
                min={2}
                max={50}
                error={errors.recurrenceOccurrences?.message}
                {...register('recurrenceOccurrences')}
              />
            )}
          </div>
        )}
      </div>

      {/* 4. Virtual Conference Link & Location */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
              <Video className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              Conference Link & Room Location
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Meet Button (Recommended) */}
            <button
              type="button"
              onClick={onAutoGenerateGoogleMeetLink}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95',
                isMeetLink
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                  : 'bg-primary-900 text-white hover:bg-primary-950 hover:shadow-md'
              )}
            >
              {isMeetLink ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <Video className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>
                {isMeetLink ? 'Re-generate Meet' : 'Auto-Generate Google Meet'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide bg-amber-400 text-amber-950 shadow-xs">
                Recommended
              </span>
            </button>

            {/* Zoho Meeting Button */}
            <button
              type="button"
              onClick={onAutoGenerateZohoLink}
              disabled={isGeneratingLink}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs border',
                isZohoLink
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-zinc-300 active:scale-95',
                isGeneratingLink && 'opacity-60 cursor-not-allowed'
              )}
            >
              {isGeneratingLink ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isZohoLink ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>
                {isGeneratingLink
                  ? 'Provisioning...'
                  : isZohoLink
                  ? 'Re-generate Zoho Link'
                  : 'Auto-Generate Zoho Link'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            name="meetingLink"
            control={control}
            render={({ field }) => (
              <div>
                <LinkInput
                  label="Virtual Meeting URL"
                  placeholder="https://meet.zoho.in/join/... or Google Meet"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.meetingLink?.message}
                />
                {field.value && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <a
                      href={field.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-900 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Test Join Link
                    </a>
                    <span className="text-zinc-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => field.onChange('')}
                      className="text-[11px] text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      Remove link
                    </button>
                  </div>
                )}
              </div>
            )}
          />

          <FormInput
            label="Physical Location / Conference Room"
            placeholder="e.g. 4th Floor Design Studio / Remote"
            error={errors.location?.message}
            {...register('location')}
          />
        </div>
      </div>

      {/* 5. Attendees Selection */}
      <Controller
        name="attendees"
        control={control}
        render={({ field }) => {
          const selectedSet = new Set(field.value || []);
          const toggleAttendee = (id) => {
            if (selectedSet.has(id)) {
              field.onChange((field.value || []).filter((v) => v !== id));
            } else {
              field.onChange([...(field.value || []), id]);
            }
          };

          return (
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Attendees & Team Invites
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      {selectedSet.size} attendee{selectedSet.size !== 1 ? 's' : ''} assigned
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search colleagues..."
                      value={attendeeSearch}
                      onChange={(e) => setAttendeeSearch(e.target.value)}
                      className="w-44 sm:w-56 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-900"
                    />
                    {attendeeSearch && (
                      <button
                        type="button"
                        onClick={() => setAttendeeSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isUsersLoading ? (
                <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 rounded-xl bg-zinc-50 border border-zinc-200/60">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  Loading team directory...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400 rounded-xl bg-zinc-50 border border-zinc-200/60">
                  No colleagues match &ldquo;{attendeeSearch}&rdquo;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedSet.has(u._id);
                    const isClientUser = u.role === 'client';

                    return (
                      <div
                        key={u._id}
                        onClick={() => toggleAttendee(u._id)}
                        className={cn(
                          'flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all select-none',
                          isSelected
                            ? 'bg-primary-900/5 border-primary-900/30 shadow-xs'
                            : 'bg-white border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-primary-900 border-primary-900 text-white'
                              : 'border-zinc-300 bg-white'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200/80 flex items-center justify-center font-bold text-xs text-zinc-700 shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-zinc-900 leading-tight">
                            {u.name || u.email}
                          </p>
                          <p className="truncate text-[10px] text-zinc-400 leading-tight mt-0.5">
                            {u.email}
                          </p>
                        </div>

                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0',
                            isClientUser
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          )}
                        >
                          {u.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }}
      />

      {/* 6. Discussion Notes / Agenda */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
            <FileText className="w-4 h-4" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
            Discussion Agenda & Notes
          </h4>
        </div>

        <FormTextarea
          rows={4}
          placeholder="Outline briefing objectives, required deliverables, key topics to resolve, or recording summary..."
          error={errors.notes?.message}
          {...register('notes')}
        />
      </div>

      {/* 7. Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-xl px-5 py-2.5 text-xs font-semibold text-zinc-700 border-zinc-200 hover:bg-zinc-100"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={isCreating || isUpdating}
          className="rounded-xl px-6 py-2.5 text-xs font-semibold bg-primary-900 text-white hover:bg-primary-950 shadow-sm"
        >
          {isEditing ? 'Save Changes' : 'Schedule Meeting'}
        </Button>
      </div>
    </form>
  );
}
