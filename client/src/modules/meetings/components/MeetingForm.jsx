import { useMemo, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '../../../utils/cn';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import StartTimePicker from '../../../components/forms/StartTimePicker';
import DurationPicker from '../../../components/forms/DurationPicker';
import LinkInput from '../../../components/forms/LinkInput';
import Button from '../../../components/ui/Button';
import { MEETING_STATUS } from '../../../constants';
import { useCreateMeetingMutation, useGenerateMeetingLinkMutation, useUpdateMeetingMutation } from '../../../services/meetingApi';
import { useGetUsersQuery } from '../../../services/userApi';

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

export default function MeetingForm({ meeting, onSuccess, onCancel }) {
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation();
  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation();
  const [generateMeetingLink, { isLoading: isGeneratingLink }] = useGenerateMeetingLinkMutation();
  const { data: usersData } = useGetUsersQuery({ limit: 100 });
  const isEditing = !!meeting;

  const users = (usersData?.data?.users || []).filter((u) => u.role !== 'client');

  const formValues = useMemo(() => meeting ? ({
    title: meeting.title || '',
    date: meeting.date ? meeting.date.split('T')[0] : '',
    startTime: meeting.startTime || '',
    endTime: meeting.endTime || '',
    meetingLink: meeting.meetingLink || '',
    location: meeting.location || '',
    notes: meeting.notes || '',
    status: meeting.status || 'scheduled',
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
    attendees: [],
    recurrenceType: 'none',
  }, [meeting]);

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
  const prevStartTime = useRef(startTimeValue);
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
        <div className="sm:col-span-2">
          <FormInput
            label="Meeting Title *"
            placeholder="Discovery Call with Client"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

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

        <FormInput
          label="Location"
          placeholder="Conference Room / Virtual"
          error={errors.location?.message}
          {...register('location')}
        />

        <FormSelect
          name="status"
          control={control}
          label="Status"
          options={MEETING_STATUS}
          error={errors.status?.message}
        />

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

      <Controller
        name="attendees"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">
              Attendees {users.length > 0 && <span className="text-xs text-zinc-400">({field.value.length} selected)</span>}
            </label>
            {users.length === 0 ? (
              <p className="text-xs text-zinc-400">No staff users available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                {users.map((u) => {
                  const checked = field.value.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
                        checked={checked}
                        onChange={() =>
                          field.onChange(
                            checked
                              ? field.value.filter((id) => id !== u._id)
                              : [...field.value, u._id]
                          )
                        }
                      />
                      <span className="truncate">{u.name || u.email}</span>
                      <span className="ml-auto text-[11px] uppercase tracking-wide text-zinc-400">{u.role}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      />

      <FormTextarea
        label="Discussion Notes"
        placeholder="What was discussed in the meeting? Agenda, decisions, action items..."
        error={errors.notes?.message}
        {...register('notes')}
      />

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
