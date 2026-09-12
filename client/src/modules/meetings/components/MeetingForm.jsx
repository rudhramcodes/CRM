import { useMemo, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, Zap, Building2, User, Users } from 'lucide-react';
import { cn } from '../../../utils/cn';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import StartTimePicker from '../../../components/forms/StartTimePicker';
import DurationPicker from '../../../components/forms/DurationPicker';
import LinkInput from '../../../components/forms/LinkInput';
import Button from '../../../components/ui/Button';
import { MEETING_STATUS, LEAD_BRANDS } from '../../../constants';
import { useCreateMeetingMutation, useGenerateMeetingLinkMutation, useUpdateMeetingMutation } from '../../../services/meetingApi';
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
    meetingLink: z.string().url('Invalid URL').optional().or(z.literal('')),
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
  .refine((data) => {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const diff = (toMin(data.endTime) - toMin(data.startTime) + 24 * 60) % (24 * 60);
    return diff > 0;
  }, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export default function MeetingForm({ meeting, onSuccess, onCancel, defaultClient, defaultLead }) {
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation();
  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation();
  const [generateMeetingLink, { isLoading: isGeneratingLink }] = useGenerateMeetingLinkMutation();

  const { data: usersData, isLoading: isUsersLoading } = useGetUsersQuery({ limit: 100 });
  const { data: clientsData, isLoading: isClientsLoading } = useGetClientsQuery({ limit: 100 });
  const { data: leadsData, isLoading: isLeadsLoading } = useGetLeadsQuery({ limit: 100 });

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

  const formValues = useMemo(() => meeting ? ({
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
  }) : {
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
  }, [meeting, defaultClient, defaultLead]);

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
  const prevStartTime = useRef(startTimeValue);

  const selectedClient = useMemo(
    () => clients.find((c) => c._id === selectedClientId),
    [clients, selectedClientId],
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
        (u) => (selectedClient.user && u._id === selectedClient.user) || (selectedClient.email && u.email?.toLowerCase() === selectedClient.email?.toLowerCase()),
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

  const onAutoGenerateLink = async () => {
    const { title, date, startTime, endTime } = watch();
    if (!title || !date || !startTime || !endTime) {
      toast.error('Fill title, date and time first to auto-generate a Zoho Meeting link');
      return;
    }
    try {
      const link = await generateMeetingLink({ title, date, startTime, endTime }).unwrap();
      setValue('meetingLink', link, { shouldValidate: true });
      toast.success('Zoho Meeting link generated');
    } catch (error) {
      toast.error(error?.data?.message || 'Could not generate link');
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        meetingLink: data.meetingLink || undefined,
        location: data.location || undefined,
        notes: data.notes || undefined,
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
          occurrences: data.recurrenceOccurrences || 3,
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
      const msg = error?.data?.message || 'Something went wrong';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title */}
        <div className="sm:col-span-2">
          <FormInput
            label="Meeting Title *"
            placeholder="Executive Sync / Strategy Briefing"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        {/* Client & Lead Linking Block */}
        <div className="sm:col-span-2 space-y-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary-900" />
              Meeting With / Related Client
            </span>
            <span className="text-[11px] text-zinc-400">Select Client or Lead</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Controller
              name="client"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Client
                  </label>
                  <select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900"
                  >
                    <option value="">No client selected (Internal or Lead meeting)</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName} {c.contactPerson ? `— ${c.contactPerson}` : ''}
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
                  <label className="block text-xs font-medium text-zinc-700 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-zinc-400" />
                    Lead (Optional)
                  </label>
                  <select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900"
                  >
                    <option value="">No lead selected</option>
                    {leads.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name} {l.company ? `(${l.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          </div>

          {selectedClient && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">{selectedClient.companyName}</span>
                {selectedClient.contactPerson && <span> &bull; {selectedClient.contactPerson}</span>}
                {selectedClient.email && <span className="text-emerald-700"> ({selectedClient.email})</span>}
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  ✓ Meeting will be visible in client portal & invitation email will be delivered to client.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Date */}
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

        <div />

        {/* Start Time */}
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

        {/* End Time */}
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

        {/* Meeting Link */}
        <Controller
          name="meetingLink"
          control={control}
          render={({ field }) => (
            <div>
              <LinkInput
                label="Meeting Link"
                placeholder="https://meet.zoho.com/abc123"
                value={field.value}
                onChange={field.onChange}
                error={errors.meetingLink?.message}
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={onAutoGenerateLink}
                  disabled={isGeneratingLink}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
                    field.value
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
                    isGeneratingLink && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {isGeneratingLink ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : field.value ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {isGeneratingLink
                    ? 'Generating link...'
                    : field.value
                      ? 'Link generated'
                      : 'Generate Zoho Meeting link'}
                </button>
                {field.value && (
                  <button
                    type="button"
                    onClick={() => field.onChange('')}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                Optional. For online meetings, generate or paste a link. Leave blank for office or in-person meetings.
              </p>
            </div>
          )}
        />

        {/* Location */}
        <FormInput
          label="Location"
          placeholder="Conference Room / Virtual"
          error={errors.location?.message}
          {...register('location')}
        />

        {/* Status */}
        <FormSelect
          name="status"
          control={control}
          label="Status"
          options={MEETING_STATUS}
          error={errors.status?.message}
        />

        {/* Venture / Brand */}
        <Controller
          name="brand"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Venture</label>
              <select
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900"
              >
                <option value="">Select venture...</option>
                {LEAD_BRANDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          )}
        />

        {/* Recurrence */}
        {!isEditing && (
          <>
            <FormSelect
              name="recurrenceType"
              control={control}
              label="Repeat"
              options={REPEAT_OPTIONS}
              error={errors.recurrenceType?.message}
            />
            {watch('recurrenceType') !== 'none' && (
              <FormInput
                type="number"
                label="Occurrences"
                placeholder="3"
                min={2}
                max={100}
                error={errors.recurrenceOccurrences?.message}
                {...register('recurrenceOccurrences')}
              />
            )}
          </>
        )}
      </div>

      {/* Attendees */}
      <Controller
        name="attendees"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-zinc-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-500" />
                Attendees {users.length > 0 && <span className="text-xs text-zinc-400">({field.value.length} selected)</span>}
              </label>
              <span className="text-xs text-zinc-400">Staff & Client Portal users</span>
            </div>
            {isUsersLoading ? (
              <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 rounded-lg border border-zinc-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                Loading team members...
              </div>
            ) : users.length === 0 ? (
              <p className="text-xs text-zinc-400">No users available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                {users.map((u) => {
                  const checked = field.value.includes(u._id);
                  const isClientUser = u.role === 'client';
                  return (
                    <label
                      key={u._id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors',
                        checked ? 'bg-primary-50/70' : 'hover:bg-zinc-50',
                        isClientUser && 'border border-emerald-100 bg-emerald-50/30',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 accent-primary-900"
                        checked={checked}
                        onChange={() =>
                          field.onChange(
                            checked
                              ? field.value.filter((id) => id !== u._id)
                              : [...field.value, u._id],
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-800">{u.name || u.email}</p>
                        {u.name && <p className="truncate text-[10px] text-zinc-400">{u.email}</p>}
                      </div>
                      <span
                        className={cn(
                          'ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                          isClientUser
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {u.role}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      />

      {/* Discussion Notes */}
      <FormTextarea
        label="Discussion Notes"
        placeholder="What was discussed in the meeting? Agenda, decisions, action items..."
        error={errors.notes?.message}
        {...register('notes')}
      />

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isCreating || isUpdating}>
          {isEditing ? 'Update Meeting' : 'Schedule Meeting'}
        </Button>
      </div>
    </form>
  );
}
