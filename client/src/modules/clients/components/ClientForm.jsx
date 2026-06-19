import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import Button from '../../../components/ui/Button';
import { CLIENT_STATUS } from '../../../constants';
import { useCreateClientMutation, useUpdateClientMutation } from '../../../services/clientApi';

const clientFormSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^[+]?[\d\s()-]{7,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  gstNumber: z
    .string()
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export default function ClientForm({ client, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [createClient, { isLoading: isCreating }] = useCreateClientMutation();
  const [updateClient, { isLoading: isUpdating }] = useUpdateClientMutation();

  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      status: 'active',
      notes: '',
    },
  });

  useEffect(() => {
    if (client) {
      reset({
        companyName: client.companyName || '',
        contactPerson: client.contactPerson || '',
        email: client.email || '',
        phone: client.phone || '',
        gstNumber: client.gstNumber || '',
        panNumber: client.panNumber || '',
        address: client.address
          ? [client.address.street, client.address.city, client.address.state, client.address.pincode]
              .filter(Boolean)
              .join(', ')
          : '',
        status: client.status || 'active',
        notes: '',
      });
    }
  }, [client, reset]);

  const onSubmit = async (data) => {
    try {
      const addressParts = (data.address || '').split(',').map((s) => s.trim());
      const payload = {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
        address: {
          street: addressParts[0] || '',
          city: addressParts[1] || '',
          state: addressParts[2] || '',
          pincode: addressParts[3] || '',
        },
        status: data.status || 'active',
      };

      if (data.notes && !isEditing) {
        payload.notes = data.notes;
      }

      if (isEditing) {
        await updateClient({ id: client._id, ...payload }).unwrap();
        toast.success('Client updated successfully');
        onSuccess?.();
      } else {
        await createClient(payload).unwrap();
        toast.success('Client created successfully');
        onSuccess ? onSuccess() : navigate('/clients');
      }
    } catch (error) {
      toast.error(error?.data?.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!onCancel && (
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Company Name *"
          placeholder="Acme Corp"
          error={errors.companyName?.message}
          {...register('companyName')}
        />
        <FormInput
          label="Contact Person *"
          placeholder="John Doe"
          error={errors.contactPerson?.message}
          {...register('contactPerson')}
        />
        <FormInput
          label="Email *"
          placeholder="john@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormInput
          label="Phone"
          placeholder="+91 98765 43210"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <FormInput
          label="GST Number"
          placeholder="22AAAAA0000A1Z5"
          error={errors.gstNumber?.message}
          {...register('gstNumber')}
        />
        <FormInput
          label="PAN Number"
          placeholder="ABCDE1234F"
          error={errors.panNumber?.message}
          {...register('panNumber')}
        />
        <FormSelect
          name="status"
          control={control}
          label="Status"
          options={CLIENT_STATUS}
          error={errors.status?.message}
        />
      </div>

      <FormTextarea
        label="Address"
        placeholder="Street, City, State, Pincode (comma separated)"
        error={errors.address?.message}
        {...register('address')}
      />

      {!isEditing && (
        <FormTextarea
          label="Notes"
          placeholder="Add any initial notes about this client..."
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
          {isEditing ? 'Update Client' : 'Create Client'}
        </Button>
      </div>
    </form>
  );
}
