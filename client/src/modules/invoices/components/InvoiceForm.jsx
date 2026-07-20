import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import Button from '../../../components/ui/Button';
const itemSchema = z.object({
  description: z.string().min(1, 'Required').max(500),
  quantity: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Min 0'),
});

const invoiceFormSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  project: z.string().optional().or(z.literal('')),
  dueDate: z.string({ required_error: 'Due date is required' }),
  items: z.array(itemSchema).min(1, 'At least one item required'),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  notes: z.string().optional().or(z.literal('')),
  termsConditions: z.string().optional().or(z.literal('')),
});

const TAX_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

export default function InvoiceForm({ clients, clientsLoading, onSubmit, isSubmitting, onCancel }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      client: '',
      project: '',
      dueDate: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      discountPercent: 0,
      notes: '',
      termsConditions: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const taxRate = watch('taxRate');
  const discountPercent = watch('discountPercent');

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect
          name="client"
          control={control}
          label="Client *"
          options={clientOptions}
          placeholder={clientsLoading ? 'Loading clients...' : 'Select client'}
          error={errors.client?.message}
        />
        <FormInput
          label="Due Date *"
          type="date"
          error={errors.dueDate?.message}
          {...register('dueDate')}
        />
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
                {(parseFloat(watchedItems?.[index]?.quantity) || 0) *
                  (parseFloat(watchedItems?.[index]?.unitPrice) || 0)
                  .toFixed(2)}
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
          Create Invoice
        </Button>
      </div>
    </form>
  );
}
