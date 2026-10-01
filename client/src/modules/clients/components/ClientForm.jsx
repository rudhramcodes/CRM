import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User, Mail, CreditCard, Hash, MapPin } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import PhoneInput from '../../../components/forms/PhoneInput';
import Button from '../../../components/ui/Button';
import { CLIENT_STATUS, BRANDS } from '../../../constants';
import { useCreateClientMutation, useUpdateClientMutation } from '../../../services/clientApi';

const clientFormSchema = z.object({
  brand: z.string().min(1, 'Please select a brand/venture'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters').max(100),
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
  gstNumber: z
    .string()
    .regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format (e.g. 22AAAAA0000A1Z5)')
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .regex(/^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format (e.g. ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  address: z
    .object({
      street: z.string().max(1000).optional().or(z.literal('')),
      city: z.string().max(200).optional().or(z.literal('')),
      state: z.string().max(200).optional().or(z.literal('')),
      pincode: z.string().max(100).optional().or(z.literal('')),
      country: z.string().max(200).optional().or(z.literal('')),
    })
    .optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const getFormValues = (client) => {
  if (!client) {
    return {
      brand: '',
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstNumber: '',
      panNumber: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
      status: 'active',
      notes: '',
    };
  }

  let street = '';
  let city = '';
  let state = '';
  let pincode = '';
  let country = 'India';

  if (typeof client.address === 'string') {
    street = client.address;
  } else if (client.address && typeof client.address === 'object') {
    street = client.address.street || '';
    city = client.address.city || '';
    state = client.address.state || '';
    pincode = client.address.pincode || '';
    country = client.address.country || 'India';
  }

  return {
    brand: client.brand || '',
    companyName: client.companyName || '',
    contactPerson: client.contactPerson || '',
    email: client.email || '',
    phone: client.phone || '',
    gstNumber: client.gstNumber || '',
    panNumber: client.panNumber || '',
    address: {
      street,
      city,
      state,
      pincode,
      country,
    },
    status: client.status || 'active',
    notes: '',
  };
};

export default function ClientForm({ client, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const [createClient, { isLoading: isCreating }] = useCreateClientMutation();
  const [updateClient, { isLoading: isUpdating }] = useUpdateClientMutation();

  const isEditing = !!client;
  const formValues = useMemo(() => getFormValues(client), [client]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientFormSchema),
    values: formValues,
  });

  const getFieldErrors = (err) => {
    if (err?.data?.errors && Array.isArray(err.data.errors)) {
      return err.data.errors.map((e) => e.message).join('. ');
    }
    return err?.data?.message || 'Something went wrong';
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        brand: data.brand,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone || undefined,
        gstNumber: data.gstNumber ? data.gstNumber.toUpperCase().trim() : undefined,
        panNumber: data.panNumber ? data.panNumber.toUpperCase().trim() : undefined,
        address: {
          street: (data.address?.street || '').trim(),
          city: (data.address?.city || '').trim(),
          state: (data.address?.state || '').trim(),
          pincode: (data.address?.pincode || '').trim(),
          country: (data.address?.country || '').trim() || 'India',
        },
        status: data.status || 'active',
      };

      if (data.notes && !isEditing) {
        payload.notes = data.notes;
      }

      if (isEditing) {
        await updateClient({ id: client._id, ...payload }).unwrap();
        toast.success('Client profile updated successfully');
        onSuccess?.();
      } else {
        const created = await createClient(payload).unwrap();
        toast.success('Client created successfully');
        onSuccess ? onSuccess(created?.data?.client) : navigate('/clients');
      }
    } catch (error) {
      toast.error(getFieldErrors(error));
    }
  };

  const isStandalone = !onCancel && !client;

  const content = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top Banner if Standalone */}
      {isStandalone && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
              Create Client Account
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Register a corporate or individual client profile with billing and portal access
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="inline-flex items-center self-start sm:self-auto gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-primary-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Clients
          </button>
        </div>
      )}

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <FormSelect
          name="brand"
          control={control}
          label="Brand / Venture *"
          options={BRANDS}
          placeholder="Select brand / venture"
          error={errors.brand?.message}
        />

        <FormInput
          label="Company Name *"
          placeholder="e.g. Acme Enterprises Ltd"
          autoCapitalize="words"
          autoComplete="organization"
          error={errors.companyName?.message}
          {...register('companyName')}
        />

        <FormInput
          label="Contact Person Name *"
          placeholder="e.g. John Doe"
          autoCapitalize="words"
          autoComplete="name"
          error={errors.contactPerson?.message}
          {...register('contactPerson')}
        />

        <FormInput
          label="Work Email Address *"
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
              label="Phone Number"
              placeholder="98765 43210"
              value={field.value}
              onChange={field.onChange}
              error={errors.phone?.message}
            />
          )}
        />

        <FormSelect
          name="status"
          control={control}
          label="Account Status"
          options={CLIENT_STATUS}
          error={errors.status?.message}
        />

        <FormInput
          label="GST Identification Number (GSTIN)"
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          autoCapitalize="characters"
          autoComplete="off"
          helperText="15-character alphanumeric GSTIN"
          error={errors.gstNumber?.message}
          {...register('gstNumber', {
            onChange: (e) => setValue('gstNumber', e.target.value.toUpperCase()),
          })}
        />

        <FormInput
          label="PAN Number"
          placeholder="ABCDE1234F"
          maxLength={10}
          autoCapitalize="characters"
          autoComplete="off"
          helperText="10-character Permanent Account Number"
          error={errors.panNumber?.message}
          {...register('panNumber', {
            onChange: (e) => setValue('panNumber', e.target.value.toUpperCase()),
          })}
        />
      </div>

      {/* Address Details Section */}
      <div className="pt-4 border-t border-zinc-100">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-zinc-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Registered Address
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div className="sm:col-span-2">
            <FormInput
              label="Street / Office Address"
              placeholder="Suite, building number, street, locality"
              error={errors.address?.street?.message}
              {...register('address.street')}
            />
          </div>
          <FormInput
            label="City"
            placeholder="e.g. Mumbai"
            error={errors.address?.city?.message}
            {...register('address.city')}
          />
          <FormInput
            label="State / Province"
            placeholder="e.g. Maharashtra"
            error={errors.address?.state?.message}
            {...register('address.state')}
          />
          <FormInput
            label="Postal Code / PIN"
            placeholder="e.g. 400001"
            error={errors.address?.pincode?.message}
            {...register('address.pincode')}
          />
          <FormInput
            label="Country"
            placeholder="India"
            error={errors.address?.country?.message}
            {...register('address.country')}
          />
        </div>
      </div>

      {/* Initial Notes only for new clients */}
      {!isEditing && (
        <div className="pt-2">
          <FormTextarea
            label="Initial Account Notes"
            placeholder="Add context on key stakeholders, deal origins, or billing agreements..."
            error={errors.notes?.message}
            rows={3}
            {...register('notes')}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-zinc-100">
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="rounded-xl text-xs font-semibold px-4 py-2.5 sm:py-2"
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/clients')}
            className="rounded-xl text-xs font-semibold px-4 py-2.5 sm:py-2"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={isCreating || isUpdating}
          className="rounded-xl text-xs font-semibold px-6 py-2.5 sm:py-2 shadow-md shadow-primary-900/10"
        >
          {isEditing ? 'Update Client Profile' : 'Create Client Account'}
        </Button>
      </div>
    </form>
  );

  if (isStandalone) {
    return (
      <div className="max-w-3xl mx-auto py-2 sm:py-6 px-1 sm:px-0">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-8 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

