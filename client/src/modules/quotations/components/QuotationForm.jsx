import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useCallback, useRef } from 'react';
import { Check } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import Button from '../../../components/ui/Button';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetQuotationDefaultsQuery } from '../../../services/quotationApi';
import QuotationDocumentFields from './QuotationDocumentFields';

const PRINTED_FIELDS = [
  'recipientName', 'recipientAddress', 'recipientEmail', 'recipientPhone', 'recipientGst',
  'clientReference', 'projectReference', 'issuerName', 'issuerAddress', 'issuerEmail',
  'issuerPhone', 'issuerWebsite', 'issuerGst', 'bankName', 'bankAccountName',
  'bankAccountNumber', 'bankIfsc', 'bankGst', 'bankUpi', 'signatoryName',
  'closingNote', 'paymentTerms', 'conditions',
];

const quotationFormSchema = z.object({
  templateId: z.enum(['standard', 'panigrahna']),
  ...Object.fromEntries(PRINTED_FIELDS.map((field) => [field, z.string().optional()])),
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
const addDays = (dateString, days) => {
  const date = dateString ? new Date(dateString) : new Date();
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

export default function QuotationForm({
  clients,
  clientsLoading,
  onSubmit,
  isSubmitting,
  onCancel,
  initialData,
  submitLabel = 'Create Quotation',
  lockIdentity = false,
}) {
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsData?.data || [];
  const printedDefaults = Object.fromEntries(PRINTED_FIELDS.map((field) => [field, initialData?.[field] ?? '']));

  const defaultValues = initialData
    ? {
        templateId: initialData.templateId || (initialData.client?.brand === 'panigrahna' ? 'panigrahna' : 'standard'),
        ...printedDefaults,
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
        templateId: 'standard',
        ...printedDefaults,
        client: '',
        project: '',
        issueDate: toDateInput(new Date()),
        validUntil: addDays(new Date(), 30),
        budget: 0,
        price: 0,
        taxRate: '18',
        salutation: '',
        subject: '',
        scopeTitle: '',
        scopeIntro: '',
        scopeOfWork: '',
        deliverables: 'Brand Identity Design\nLogo & Visual Assets\nPrint & Digital Collateral\nSocial Media Creatives\nFinal Files (Source + Export Formats)',
        note: 'Payment Terms: 50% advance along with the confirmation, 50% before final delivery.\nGST @18% is applicable as quoted.\nAny additional scope will be quoted separately.',
        letterBody: '',
        letterSignoff: 'Warm Regards,\nRudhram Enterprises',
      };

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm({
    resolver: zodResolver(quotationFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (initialData) reset(defaultValues);
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedClient = watch('client');
  const selectedProject = watch('project');
  const selectedTemplate = watch('templateId');
  const price = watch('price');
  const taxRate = watch('taxRate');
  const budget = watch('budget');
  const selectedClientInfo = (clients || []).find((client) => String(client._id) === String(selectedClient));
  const recommendedTemplate = selectedClientInfo?.brand === 'panigrahna' ? 'panigrahna' : 'standard';
  const lastTemplateClient = useRef(initialData?.client?._id || initialData?.client || '');

  useEffect(() => {
    if (initialData || selectedClient === lastTemplateClient.current) return;
    lastTemplateClient.current = selectedClient;
    setValue('templateId', recommendedTemplate, { shouldDirty: false });
  }, [initialData, recommendedTemplate, selectedClient, setValue]);

  const { data: defaultsData } = useGetQuotationDefaultsQuery(
    { clientId: selectedClient || undefined, projectId: selectedProject || undefined, templateId: selectedTemplate },
    { skip: Boolean(initialData) },
  );
  const defaults = defaultsData?.data?.defaults;

  const applyDefaults = useCallback((fields, { force = false } = {}) => {
    if (!defaults) return;
    for (const name of fields) {
      if (!force && dirtyFields[name]) continue;
      const value = defaults[name];
      if (value === undefined || value === null) continue;
      setValue(name, name === 'scopeOfWork' && Array.isArray(value) ? value.join('\n') : value, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [defaults, dirtyFields, setValue]);

  useEffect(() => {
    applyDefaults([
      'salutation', 'subject', 'letterBody', 'letterSignoff', 'scopeTitle',
      'scopeIntro', 'scopeOfWork', 'deliverables', 'note', 'budget', 'price', 'validUntil',
      ...PRINTED_FIELDS,
    ]);
  }, [applyDefaults]);

  const clientProjects = selectedClient
    ? projects.filter((p) => String(p.client?._id || p.client) === String(selectedClient))
    : [];

  const lastAutoProject = useRef(initialData?.project?._id || initialData?.project || '');

  useEffect(() => {
    if (lockIdentity || !selectedClient || !selectedProject || projects.length === 0) return;
    const belongsToClient = clientProjects.some(
      (p) => String(p._id) === String(selectedProject),
    );
    if (!belongsToClient) setValue('project', '');
  }, [lockIdentity, selectedClient, selectedProject, projects, setValue]);

  useEffect(() => {
    if (!selectedProject || selectedProject === lastAutoProject.current) return;
    const project = projects.find((p) => String(p._id) === String(selectedProject));
    if (!project) return;
    lastAutoProject.current = selectedProject;
    if (!dirtyFields.budget) setValue('budget', project.budget ?? 0);
    if (!dirtyFields.scopeTitle) setValue('scopeTitle', project.title || '');
    if (!dirtyFields.subject) setValue('subject', `Submission of Quotation for Professional ${project.title || 'Brand Kit'}.`);
  }, [selectedProject, projects, setValue, dirtyFields]);

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
    <form aria-label={submitLabel} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <fieldset disabled={lockIdentity} className="grid grid-cols-1 sm:grid-cols-2 gap-4 disabled:opacity-60">
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
      </fieldset>
      {lockIdentity && <p className="text-xs text-zinc-500">The client and project stay fixed across revisions. Printed recipient details remain editable below.</p>}

      <fieldset className="space-y-3 rounded-xl bg-zinc-50 p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-zinc-900">Quotation template</legend>
        <p className="text-sm text-zinc-600">
          {selectedClientInfo
            ? `${selectedClientInfo.companyName} belongs to ${selectedClientInfo.brand === 'panigrahna' ? 'Panigrahna' : 'another venture'}. ${recommendedTemplate === 'panigrahna' ? 'The wedding quotation is recommended.' : 'The standard quotation is recommended.'}`
            : 'Choose a client to get a recommended template. You can always change it.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'standard', title: 'Standard quotation', detail: '3 pages: cover letter, scope, summary' },
            { id: 'panigrahna', title: 'Panigrahna wedding', detail: '4 pages: letter + scope, deliverables, terms, pricing' },
          ].map((template) => (
            <button
              key={template.id}
              type="button"
              aria-pressed={selectedTemplate === template.id}
              onClick={() => setValue('templateId', template.id, { shouldDirty: true })}
              className={`min-h-20 rounded-lg border border-zinc-200 p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${selectedTemplate === template.id ? 'bg-amber-50 text-amber-950' : 'bg-white text-zinc-800 hover:bg-zinc-100'}`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {template.title}
                {selectedTemplate === template.id && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </span>
              <span className="mt-1 block text-xs text-zinc-600">{template.detail}</span>
            </button>
          ))}
        </div>
        {selectedClient && selectedTemplate !== recommendedTemplate && (
          <button
            type="button"
            onClick={() => setValue('templateId', recommendedTemplate, { shouldDirty: false })}
            className="min-h-9 text-sm font-medium text-amber-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700"
          >
            Use recommended template
          </button>
        )}
        <p className="text-xs text-zinc-500">Changing templates updates suggested text you have not edited. Your own writing is kept.</p>
      </fieldset>

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

      <div className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Write the document</h2>
        <p className="text-sm text-zinc-500">Each section below maps to a page in the final PDF. You can review the rendered pages after creating the draft.</p>
      </div>
      <QuotationDocumentFields
        templateId={selectedTemplate}
        register={register}
        errors={errors}
        applyDefaults={applyDefaults}
        canRestore={Boolean(defaults)}
      />

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
