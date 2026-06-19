import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import PhoneInput from '../../../components/forms/PhoneInput';
import Button from '../../../components/ui/Button';
import { LEAD_STATUS, LEAD_SOURCES } from '../../../constants';
import { useCreateLeadMutation, useUpdateLeadMutation } from '../../../services/leadApi';

const leadFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^$|^[+]?[\d\s()-]{7,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  source: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export default function LeadForm({ lead, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();

  const isEditing = !!lead;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'other',
      status: 'new',
      notes: '',
    },
  });

  useEffect(() => {
    if (lead) {
      reset({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        source: lead.source || 'other',
        status: lead.status || 'new',
        notes: '',
      });
    }
  }, [lead, reset]);

  const getFieldErrors = (err) => {
    if (err?.data?.errors && Array.isArray(err.data.errors)) {
      return err.data.errors.map((e) => e.message).join('. ');
    }
    return err?.data?.message || 'Something went wrong';
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        company: data.company || undefined,
        source: data.source || 'other',
        status: data.status || 'new',
      };

      if (data.notes && !isEditing) {
        payload.notes = [{ text: data.notes }];
      }

      if (isEditing) {
        await updateLead({ id: lead._id, ...payload }).unwrap();
        toast.success('Lead updated successfully');
        onSuccess?.();
      } else {
        await createLead(payload).unwrap();
        toast.success('Lead created successfully');
        onSuccess ? onSuccess() : navigate('/leads');
      }
    } catch (error) {
      toast.error(getFieldErrors(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!onCancel && (
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Full Name *"
          placeholder="John Doe"
          autoCapitalize="words"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <FormInput
          label="Email *"
          type="email"
          placeholder="john@company.com"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label="Phone"
              placeholder="98765 43210"
              value={field.value}
              onChange={field.onChange}
              error={errors.phone?.message}
            />
          )}
        />
        <FormInput
          label="Company"
          placeholder="Acme Corp"
          autoCapitalize="words"
          error={errors.company?.message}
          {...register('company')}
        />
        <FormSelect
          name="source"
          control={control}
          label="Source"
          options={LEAD_SOURCES}
          error={errors.source?.message}
        />
        <FormSelect
          name="status"
          control={control}
          label="Status"
          options={LEAD_STATUS}
          error={errors.status?.message}
        />
      </div>

      {!isEditing && (
        <FormTextarea
          label="Notes"
          placeholder="Add any initial notes about this lead..."
          error={errors.notes?.message}
          {...register('notes')}
        />
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isCreating || isUpdating}>
          {isEditing ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
