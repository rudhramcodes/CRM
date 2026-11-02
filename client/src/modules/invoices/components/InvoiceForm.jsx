import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import Button from '../../../components/ui/Button';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { INVOICE_PRINTED_FIELDS } from '../quotationToInvoice';

const itemSchema = z.object({
  description: z.string().min(1, 'Required').max(500),
  quantity: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Min 0'),
});

const invoiceFormSchema = z.object({
  ...Object.fromEntries(INVOICE_PRINTED_FIELDS.map((field) => [field, z.string().optional()])),
  client: z.string().min(1, 'Client is required'),
  project: z.string().optional().or(z.literal('')),
  sourceQuotation: z.string().optional().or(z.literal('')),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string({ required_error: 'Due date is required' }).min(1, 'Due date is required'),
  items: z.array(itemSchema).min(1, 'At least one item required'),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  billingAddress: z.object({
    street: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    pincode: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
  }).optional(),
  notes: z.string().optional().or(z.literal('')),
  termsConditions: z.string().optional().or(z.literal('')),
}).refine((data) => new Date(data.dueDate) >= new Date(data.issueDate), {
  path: ['dueDate'], message: 'Due date must be on or after issue date',
});

const TAX_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

export default function InvoiceForm({ clients, clientsLoading, onSubmit, isSubmitting, onCancel, initialData, submitLabel = 'Create Invoice' }) {
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const projects = projectsData?.data || [];
  const today = new Date();
  const defaultDueDate = new Date(today);
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);
  const printedDefaults = Object.fromEntries(INVOICE_PRINTED_FIELDS.map((field) => [field, initialData?.[field] ?? '']));

  const defaultValues = initialData
    ? {
        ...printedDefaults,
        client: initialData.client?._id || initialData.client || '',
        project: initialData.project?._id || initialData.project || '',
        sourceQuotation: initialData.sourceQuotation?._id || initialData.sourceQuotation || '',
        issueDate: initialData.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : today.toISOString().split('T')[0],
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        items: (initialData.items || []).map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxRate: initialData.taxRate ?? 0,
        discountPercent: initialData.discountPercent ?? 0,
        billingAddress: initialData.billingAddress || { street: '', city: '', state: '', pincode: '', country: 'India' },
        notes: initialData.notes || '',
        termsConditions: initialData.termsConditions || '',
      }
    : {
        ...printedDefaults,
        client: '',
         project: '',
         sourceQuotation: '',
         issueDate: today.toISOString().split('T')[0],
         dueDate: defaultDueDate.toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
        taxRate: 0,
        discountPercent: 0,
        billingAddress: { street: '', city: '', state: '', pincode: '', country: 'India' },
        notes: '',
        termsConditions: '',
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
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (initialData) {
      reset(defaultValues);
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const taxRate = watch('taxRate');
  const discountPercent = watch('discountPercent');
  const selectedClient = watch('client');
  const selectedProject = watch('project');
  const clientProjects = selectedClient
    ? projects.filter((p) => String(p.client?._id || p.client) === String(selectedClient))
    : [];

  useEffect(() => {
    if (!selectedClient || !selectedProject || projects.length === 0) return;
    const belongsToClient = projects.some(
      (p) => String(p._id) === String(selectedProject)
        && String(p.client?._id || p.client) === String(selectedClient),
    );
    if (!belongsToClient) setValue('project', '');
  }, [selectedClient, selectedProject, projects, setValue]);

  useEffect(() => {
    if (initialData || !selectedClient) return;
    const client = (clients || []).find((item) => String(item._id) === String(selectedClient));
    if (!client) return;
    for (const [field, value] of Object.entries({
      recipientName: client.companyName || '',
      recipientEmail: client.email || '',
      recipientPhone: client.phone || '',
      recipientGst: client.gstNumber || '',
      clientReference: client.clientId || '',
    })) {
      if (!dirtyFields[field]) setValue(field, value);
    }
    if (!client.address) return;
    for (const field of ['street', 'city', 'state', 'pincode', 'country']) {
      if (!dirtyFields.billingAddress?.[field]) {
        setValue(`billingAddress.${field}`, client.address[field] || (field === 'country' ? 'India' : ''));
      }
    }
  }, [selectedClient, clients, initialData, dirtyFields, setValue]);

  useEffect(() => {
    if (initialData || !selectedProject || dirtyFields.projectReference) return;
    const project = projects.find((item) => String(item._id) === String(selectedProject));
    if (project) setValue('projectReference', project.projectCode || '');
  }, [selectedProject, projects, initialData, dirtyFields.projectReference, setValue]);

  const subtotal = (watchedItems || []).reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    0,
  );
  const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100;
  const discountAmount = (subtotal * (parseFloat(discountPercent) || 0)) / 100;
  const total = subtotal + taxAmount - discountAmount;

  const clientOptions = (clients || []).map((c) => ({
    value: c._id,
    label: `${c.clientId || ''} ${c.companyName}`.trim(),
  }));

  const handleFormSubmit = useCallback(
    (data) => {
      onSubmit({
        ...data,
        client: data.client,
        items: data.items.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
        taxRate: parseFloat(data.taxRate) || 0,
        discountPercent: parseFloat(data.discountPercent) || 0,
      });
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormSelect
          name="client"
          control={control}
          label="Client *"
          options={clientOptions}
          placeholder={clientsLoading ? 'Loading clients...' : 'Select client'}
          error={errors.client?.message}
        />
        <Controller
          name="issueDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Issue Date *"
              value={field.value}
              onChange={field.onChange}
              error={errors.issueDate?.message}
              placeholder="Select issue date"
            />
          )}
        />
        <Controller
          name="dueDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Due Date *"
              value={field.value}
              onChange={field.onChange}
              error={errors.dueDate?.message}
              placeholder="Select due date"
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700">Invoice Items</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
        {errors.items?.message && (
          <p className="text-sm text-red-500">{errors.items.message}</p>
        )}

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2 p-3 bg-zinc-50 rounded-lg">
              <div className="flex-1">
                <FormInput
                  placeholder="Item description"
                  error={errors.items?.[index]?.description?.message}
                  {...register(`items.${index}.description`)}
                />
              </div>
              <div className="w-24">
                <FormInput
                  type="number"
                  min="1"
                  placeholder="Qty"
                  error={errors.items?.[index]?.quantity?.message}
                  {...register(`items.${index}.quantity`)}
                />
              </div>
              <div className="w-32">
                <FormInput
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  error={errors.items?.[index]?.unitPrice?.message}
                  {...register(`items.${index}.unitPrice`)}
                />
              </div>
        <div className="w-24 pt-2 text-sm text-right text-zinc-600 font-medium">
                {((parseFloat(watchedItems?.[index]?.quantity) || 0) *
                  (parseFloat(watchedItems?.[index]?.unitPrice) || 0)).toFixed(2)}
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="pt-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-4">
          <FormSelect
            name="taxRate"
            control={control}
            label="GST Rate"
            options={TAX_OPTIONS}
            placeholder="Select GST"
          />
          <FormInput
            label="Discount %"
            type="number"
            min="0"
            max="100"
            step="1"
            {...register('discountPercent')}
          />
        </div>
        <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">GST ({taxRate}%)</span>
            <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Discount ({discountPercent}%)</span>
            <span className="font-medium text-red-600">-₹{discountAmount.toFixed(2)}</span>
          </div>
          <hr className="border-zinc-200" />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <details className="border border-zinc-200 rounded-lg">
        <summary className="text-sm font-medium text-zinc-700 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 select-none">Billing Address</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 pt-3">
          <FormInput label="Street" placeholder="Street address" {...register('billingAddress.street')} />
          <FormInput label="City" placeholder="City" {...register('billingAddress.city')} />
          <FormInput label="State" placeholder="State" {...register('billingAddress.state')} />
          <FormInput label="Pincode" placeholder="Pincode" {...register('billingAddress.pincode')} />
          <FormInput label="Country" placeholder="Country" {...register('billingAddress.country')} />
        </div>
      </details>

      <details className="border border-zinc-200 rounded-lg">
        <summary className="text-sm font-medium text-zinc-700 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 select-none">Edit printed client, issuer and bank details</summary>
        <div className="space-y-5 border-t border-zinc-200 p-4">
          <p className="text-sm text-zinc-600">These fields control what appears on this invoice. Blank issuer or bank fields use the current company details; changing them does not edit the client record.</p>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">Billed to</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Printed client name" {...register('recipientName')} />
              <FormInput label="Printed client ID" {...register('clientReference')} />
              <FormInput label="Printed client email" type="email" {...register('recipientEmail')} />
              <FormInput label="Printed client phone" {...register('recipientPhone')} />
              <FormInput label="Printed client GST" {...register('recipientGst')} />
              <FormInput label="Printed project reference" {...register('projectReference')} />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">Issuer</h3>
            <FormInput label="Issuer name" {...register('issuerName')} />
            <FormTextarea label="Issuer address" rows={3} {...register('issuerAddress')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Issuer email" type="email" {...register('issuerEmail')} />
              <FormInput label="Issuer phone" {...register('issuerPhone')} />
              <FormInput label="Issuer GST" {...register('issuerGst')} />
              <FormInput label="Signature name" {...register('signatoryName')} />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">Bank details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Bank name" {...register('bankName')} />
              <FormInput label="Account name" {...register('bankAccountName')} />
              <FormInput label="Account number" {...register('bankAccountNumber')} />
              <FormInput label="IFSC code" {...register('bankIfsc')} />
              <FormInput label="Bank GST" {...register('bankGst')} />
              <FormInput label="UPI ID" {...register('bankUpi')} />
            </div>
          </div>
        </div>
      </details>

      <FormTextarea
        label="Notes"
        placeholder="Additional notes..."
        rows={3}
        error={errors.notes?.message}
        {...register('notes')}
      />

      <FormTextarea
        label="Terms & Conditions"
        placeholder="Payment terms, delivery terms..."
        rows={3}
        error={errors.termsConditions?.message}
        {...register('termsConditions')}
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
