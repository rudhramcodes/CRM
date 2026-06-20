import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import TimePicker from '../../../components/forms/TimePicker';
import LinkInput from '../../../components/forms/LinkInput';
import Button from '../../../components/ui/Button';
import { MEETING_STATUS } from '../../../constants';
import { useCreateMeetingMutation, useUpdateMeetingMutation } from '../../../services/meetingApi';

const meetingFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    description: z.string().max(1000).optional().or(z.literal('')),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    meetingLink: z.string().url('Invalid URL').optional().or(z.literal('')),
    location: z.string().max(200).optional().or(z.literal('')),
    notes: z.string().max(2000).optional().or(z.literal('')),
    status: z.string().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export default function MeetingForm({ meeting, onSuccess, onCancel }) {
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation();
  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation();
  const isEditing = !!meeting;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      meetingLink: '',
      location: '',
      notes: '',
      status: 'scheduled',
    },
  });

  useEffect(() => {
    if (meeting) {
      reset({
        title: meeting.title || '',
        description: meeting.description || '',
        date: meeting.date ? meeting.date.split('T')[0] : '',
        startTime: meeting.startTime || '',
        endTime: meeting.endTime || '',
        meetingLink: meeting.meetingLink || '',
        location: meeting.location || '',
        notes: meeting.notes || '',
        status: meeting.status || 'scheduled',
      });
    }
  }, [meeting, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        meetingLink: data.meetingLink || undefined,
        location: data.location || undefined,
        notes: data.notes || undefined,
        status: data.status || 'scheduled',
      };

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
            <TimePicker
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
            <TimePicker
              label="End Time *"
              value={field.value}
              onChange={field.onChange}
              error={errors.endTime?.message}
            />
          )}
        />

        <Controller
          name="meetingLink"
          control={control}
          render={({ field }) => (
            <LinkInput
              label="Meeting Link"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={field.value}
              onChange={field.onChange}
              error={errors.meetingLink?.message}
            />
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
      </div>

      <FormTextarea
        label="Description"
        placeholder="Meeting agenda, talking points..."
        error={errors.description?.message}
        {...register('description')}
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
