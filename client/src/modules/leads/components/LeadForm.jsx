import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Building2, Globe, Tag, Check, Sparkles } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import PhoneInput from '../../../components/forms/PhoneInput';
import Button from '../../../components/ui/Button';
import { LEAD_STATUS, LEAD_SOURCES, LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import { useCreateLeadMutation, useUpdateLeadMutation } from '../../../services/leadApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { cn } from '../../../utils/cn';

const leadFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^$|^[+]?[\d\s()-]{7,15}$/, 'Invalid phone number')
    .refine(
      (val) => val === '' || val.replace(/^\+?\d{1,3}\s*/, '').replace(/[^\d]/g, '').length >= 10,
      { message: 'Phone number must have at least 10 digits' }
    )
    .optional()
    .or(z.literal('')),
  brand: z.string().optional().or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  source: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  lostReason: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().optional(),
});

export default function LeadForm({ lead, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  const allUsers = (usersData?.data?.users || []).filter((u) => u.role !== 'client');
  const nameCounts = {};
  allUsers.forEach((u) => {
    nameCounts[u.name] = (nameCounts[u.name] || 0) + 1;
  });
  const userOptions = allUsers.map((u) => ({
    value: u._id,
    label: nameCounts[u.name] > 1 ? `${u.name} <${u.email}>` : u.name,
  }));
  const isEditing = !!lead;

  const formValues = useMemo(
    () =>
      lead
        ? {
          name: lead.name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          brand: lead.brand || '',
          company: lead.company || '',
          source: lead.source || 'other',
          status: lead.status || 'new',
          assignedTo: lead.assignedTo?._id || lead.assignedTo || '',
          lostReason: lead.lostReason || '',
          notes: '',
        }
        : {
          name: '',
          email: '',
          phone: '',
          brand: '',
          company: '',
          source: 'other',
          status: 'new',
          assignedTo: '',
          lostReason: '',
          notes: '',
        },
    [lead]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leadFormSchema),
    values: formValues,
  });

  const watchedStatus = watch('status');

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
        brand: data.brand || undefined,
        company: data.company || undefined,
        source: data.source || 'other',
        status: data.status || 'new',
        assignedTo: data.assignedTo || undefined,
        lostReason: data.lostReason || undefined,
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

  const isStandalone = !onCancel && !lead;

  const content = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top Banner if Standalone */}
      {isStandalone && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-primary-900 tracking-tight">
              Create New Lead
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Record a new prospective client or business inquiry in your pipeline
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/leads')}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-primary-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/80 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Leads
          </button>
        </div>
      )}

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormInput
          label="Full Name *"
          placeholder="e.g. John Doe"
          autoCapitalize="words"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />

        <FormInput
          label="Email Address *"
          type="email"
          placeholder="john@example.com"
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
              label="Phone Number"
              placeholder="98765 43210"
              value={field.value}
              onChange={field.onChange}
              error={errors.phone?.message}
            />
          )}
        />

        <FormSelect
          name="brand"
          control={control}
          label="Company Brand / Venture"
          placeholder="Select venture"
          options={LEAD_BRANDS}
          error={errors.brand?.message}
        />

        <FormInput
          label="Company / Organization"
          placeholder="e.g. Acme Corp"
          autoCapitalize="words"
          error={errors.company?.message}
          {...register('company')}
        />

        <FormSelect
          name="source"
          control={control}
          label="Lead Acquisition Source"
          options={LEAD_SOURCES}
          error={errors.source?.message}
        />

        <FormSelect
          name="status"
          control={control}
          label="Pipeline Stage"
          options={LEAD_STATUS}
          error={errors.status?.message}
        />

        <FormSelect
          name="assignedTo"
          control={control}
          label="Assigned Representative"
          placeholder="Myself (Default)"
          options={[
            { value: '', label: 'Myself (Default)' },
            ...userOptions,
          ]}
          error={errors.assignedTo?.message}
        />
      </div>

      {/* Lost Reason textarea if status === 'lost' */}
      {watchedStatus === 'lost' && (
        <FormTextarea
          label="Lost Reason *"
          placeholder="Why was this opportunity lost? (e.g. Price too high, chosen competitor...)"
          error={errors.lostReason?.message}
          {...register('lostReason')}
        />
      )}

      {/* Initial Notes only for new leads */}
      {!isEditing && (
        <FormTextarea
          label="Initial Inquiries & Notes"
          placeholder="Add requirement notes, budget expectations, or discussion summaries..."
          error={errors.notes?.message}
          rows={3}
          {...register('notes')}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-zinc-100">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel || (() => navigate('/leads'))}
          className="w-full sm:w-auto rounded-xl text-xs font-semibold px-4 py-2.5 sm:py-2"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isCreating || isUpdating}
          className="w-full sm:w-auto rounded-xl text-xs font-semibold px-6 py-2.5 sm:py-2 shadow-md shadow-primary-900/10 cursor-pointer"
        >
          {isEditing ? 'Update Lead' : 'Create Lead Opportunity'}
        </Button>
      </div>
    </form>
  );

  if (isStandalone) {
    return (
      <div className="max-w-3xl mx-auto py-1 sm:py-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200/80 p-4 sm:p-7 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
