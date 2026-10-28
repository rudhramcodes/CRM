import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useCallback, useRef } from 'react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import Button from '../../../components/ui/Button';
import { useGetProjectsQuery } from '../../../services/projectApi';

const quotationFormSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  project: z.string().optional().or(z.literal('')),
  issueDate: z.string({ required_error: 'Issue date is required' }),
  validUntil: z.string().optional().or(z.literal('')),
  budget: z.coerce.number().min(0, 'Min 0'),
  price: z.coerce.number().min(0, 'Min 0'),
  taxRate: z.coerce.number().min(0).max(100),
  salutation: z.string().optional().or(z.literal('')),
  subject: z.string().optional().or(z.literal('')),
  scopeTitle: z.string().optional().or(z.literal('')),
  scopeIntro: z.string().optional().or(z.literal('')),
  scopeOfWork: z.string().optional().or(z.literal('')),
  deliverables: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
  letterBody: z.string().optional().or(z.literal('')),
  letterSignoff: z.string().optional().or(z.literal('')),
});

const TAX_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

const toDateInput = (value) => (value ? new Date(value).toISOString().split('T')[0] : '');

export default function QuotationForm({
  clients,
  clientsLoading,
  onSubmit,
  isSubmitting,
  onCancel,
  initialData,
  submitLabel = 'Create Quotation',
}) {
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsData?.data || [];

  const defaultValues = initialData
    ? {
        client: initialData.client?._id || initialData.client || '',
        project: initialData.project?._id || initialData.project || '',
        issueDate: toDateInput(initialData.issueDate) || toDateInput(new Date()),
        validUntil: toDateInput(initialData.validUntil),
        budget: initialData.budget ?? 0,
        price: initialData.price ?? 0,
        taxRate: String(initialData.taxRate ?? 18),
        salutation: initialData.salutation || '',
        subject: initialData.subject || '',
        scopeTitle: initialData.scopeTitle || '',
        scopeIntro: initialData.scopeIntro || '',
        scopeOfWork: (initialData.scopeOfWork || []).join('\n'),
        deliverables: initialData.deliverables || '',
        note: initialData.note || '',
        letterBody: initialData.letterBody || '',
        letterSignoff: initialData.letterSignoff || '',
      }
    : {
        client: '',
        project: '',
        issueDate: toDateInput(new Date()),
        validUntil: '',
        budget: 0,
        price: 0,
        taxRate: '18',
        salutation: '',
        subject: '',
        scopeTitle: '',
        scopeIntro: '',
        scopeOfWork: '',
        deliverables: 'As per the letterhead',
        note: '',
        letterBody: '',
        letterSignoff: '',
      };

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quotationFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (initialData) reset(defaultValues);
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedClient = watch('client');
  const selectedProject = watch('project');
  const price = watch('price');
  const taxRate = watch('taxRate');
  const budget = watch('budget');

  const clientProjects = selectedClient
    ? projects.filter((p) => String(p.client?._id || p.client) === String(selectedClient))
    : [];

  const lastAutoProject = useRef(initialData?.project?._id || initialData?.project || '');

  useEffect(() => {
    if (!selectedClient || !selectedProject || projects.length === 0) return;
    const belongsToClient = clientProjects.some(
      (p) => String(p._id) === String(selectedProject),
    );
    if (!belongsToClient) setValue('project', '');
  }, [selectedClient, selectedProject, projects, setValue]);

  useEffect(() => {
    if (!selectedProject || selectedProject === lastAutoProject.current) return;
    const project = projects.find((p) => String(p._id) === String(selectedProject));
    if (!project) return;
    lastAutoProject.current = selectedProject;
    setValue('budget', project.budget ?? 0);
    setValue('scopeTitle', project.title || '');
    setValue('subject', `Submission of Quotation for Professional ${project.title || 'Brand Kit'}.`);
  }, [selectedProject, projects, setValue]);

  const subtotal = parseFloat(price) || 0;
  const gstRate = parseFloat(taxRate) || 0;
  const taxAmount = (subtotal * gstRate) / 100;
  const total = subtotal + taxAmount;
  const clientBudget = parseFloat(budget) || 0;

  const clientOptions = (clients || []).map((c) => ({
    value: c._id,
    label: `${c.clientId || ''} ${c.companyName}`.trim(),
  }));

  const handleFormSubmit = useCallback(
    (data) => {
      onSubmit({
        ...data,
        project: data.project || null,
        issueDate: data.issueDate || undefined,
        validUntil: data.validUntil || null,
        budget: parseFloat(data.budget) || 0,
        price: parseFloat(data.price) || 0,
        taxRate: parseFloat(data.taxRate) || 0,
        scopeOfWork: (data.scopeOfWork || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      });
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect
          name="client"
          control={control}
          label="Client *"
          options={clientOptions}
          placeholder={clientsLoading ? 'Loading clients...' : 'Select client'}
          error={errors.client?.message}
        />
        <FormSelect
          name="project"
          control={control}
          label="Project"
          options={clientProjects.map((p) => ({
            value: p._id,
            label: [p.projectCode, p.title || p.name || p._id].filter(Boolean).join(' — '),
          }))}
          placeholder={selectedClient ? 'Select project (optional)' : 'Select client first'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Controller
          name="issueDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Quotation Date *"
              value={field.value}
              onChange={field.onChange}
              error={errors.issueDate?.message}
              placeholder="Select date"
            />
          )}
        />
        <Controller
          name="validUntil"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Valid Until"
              value={field.value}
              onChange={field.onChange}
              error={errors.validUntil?.message}
              placeholder="Select date"
            />
          )}
        />
        <FormSelect
          name="taxRate"
          control={control}
          label="GST Rate"
          options={TAX_OPTIONS}
          placeholder="Select GST"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Client Budget (₹)"
          type="number"
          min="0"
          step="0.01"
          {...register('budget')}
        />
        <FormInput
          label="Quotation Price / Subtotal (₹)"
          type="number"
          min="0"
          step="0.01"
          {...register('price')}
        />
      </div>

      <div className="bg-zinc-50 rounded-lg p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Budget</p>
            <p className="font-semibold text-zinc-700">₹{clientBudget.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Subtotal</p>
            <p className="font-semibold text-zinc-900">₹{subtotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">GST ({gstRate}%)</p>
            <p className="font-semibold text-zinc-900">₹{taxAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Total</p>
            <p className="font-bold text-zinc-900">₹{total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Cover Letter</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Page 1 of the quotation. Leave blank to use the default letter.</p>
        </div>
        <FormInput
          label="Salutation"
          placeholder="Dear Client,"
          error={errors.salutation?.message}
          {...register('salutation')}
        />
        <FormTextarea
          label="Letter Body"
          placeholder="Write the cover letter. Use a blank line between paragraphs."
          rows={10}
          error={errors.letterBody?.message}
          {...register('letterBody')}
        />
        <FormTextarea
          label="Sign-off"
          placeholder="Warm regards,&#10;Rudhram Enterprises"
          rows={2}
          error={errors.letterSignoff?.message}
          {...register('letterSignoff')}
        />
      </div>

      <div className="border-t border-zinc-200 pt-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Scope</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Page 2 and page 3 of the quotation. Client and project details are pulled automatically.</p>
        </div>
        <FormInput
          label="Subject"
          placeholder="Submission of Quotation for Professional Brand Kit."
          error={errors.subject?.message}
          {...register('subject')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Scope of Work (summary)"
            placeholder="Brand Kit"
            error={errors.scopeTitle?.message}
            {...register('scopeTitle')}
          />
          <FormInput
            label="Deliverables"
            placeholder="As per the letterhead"
            error={errors.deliverables?.message}
            {...register('deliverables')}
          />
        </div>
        <FormTextarea
          label="Scope Introduction"
          placeholder="The assignment covers..."
          rows={3}
          error={errors.scopeIntro?.message}
          {...register('scopeIntro')}
        />
        <FormTextarea
          label="Scope of Work Bullets"
          placeholder="One bullet point per line"
          rows={8}
          error={errors.scopeOfWork?.message}
          {...register('scopeOfWork')}
        />
        <FormTextarea
          label="Note"
          placeholder="Payment terms, exclusions, or other notes..."
          rows={3}
          error={errors.note?.message}
          {...register('note')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
