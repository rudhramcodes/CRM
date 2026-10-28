import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Building2, Plus } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ClientForm from '../../clients/components/ClientForm';
import { useGetClientsQuery } from '../../../services/clientApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { useCreateProjectMutation, useUpdateProjectMutation } from '../../../services/projectApi';

const projectFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    client: z.string().min(1, 'Please select a client'),
    ownerId: z.string().optional(),
    description: z.string().max(2000).optional().or(z.literal('')),
    priority: z.string().optional(),
    reason: z.string().max(2000).optional().or(z.literal('')),
    budget: z.coerce.number().min(0).optional().or(z.literal('')),
    startDate: z.string().optional().or(z.literal('')),
    deadline: z.string().optional().or(z.literal('')),
    tags: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.startDate && data.deadline) {
        return new Date(data.deadline) >= new Date(data.startDate);
      }
      return true;
    },
    { message: 'Deadline must be after start date', path: ['deadline'] },
  );

export default function ProjectForm({ project, onSuccess, onCancel }) {
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const isEditing = !!project;
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClient, setNewClient] = useState(null);

  const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery(
    { limit: 100 },
  );
  const clients = clientsData?.data || [];
  const { data: usersData, isLoading: usersLoading, isError: usersError } = useGetUsersQuery({ limit: 100 });
  const users = usersData?.data?.users || (Array.isArray(usersData?.data) ? usersData.data : []);
  const ownerOptions = users.filter((u) => u.role !== 'client' && u.isActive !== false)
    .map((u) => ({ value: u._id, label: u.name }));

  const clientOptions = useMemo(() => {
    const fromQuery = clients.map((c) => ({
      value: c._id,
      label: c.companyName,
    }));
    if (newClient && !fromQuery.some((o) => o.value === newClient._id)) {
      return [{ value: newClient._id, label: newClient.companyName }, ...fromQuery];
    }
    return fromQuery;
  }, [clients, newClient]);

  const formValues = useMemo(() => project ? ({
    title: project.title || '',
    client: project.client?._id || '',
    ownerId: project.ownerId?._id || project.ownerId || '',
    description: project.description || '',
    priority: project.priority || 'medium',
    reason: '',
    budget: project.budget || '',
    startDate: project.startDate ? project.startDate.split('T')[0] : '',
    deadline: project.deadline ? project.deadline.split('T')[0] : '',
    tags: project.tags?.join(', ') || '',
  }) : {
    title: '',
    client: '',
    ownerId: '',
    description: '',
    priority: 'medium',
    reason: '',
    budget: '',
    startDate: '',
    deadline: '',
    tags: '',
  }, [project]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectFormSchema),
    // ponytail: `values` prop syncs back over setValue (fights it) — use defaultValues + manual reset
    defaultValues: formValues,
  });

  useEffect(() => {
    reset(formValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const handleClientCreated = (createdClient) => {
    setShowNewClientModal(false);
    if (createdClient?._id) {
      setNewClient(createdClient);
      setValue('client', createdClient._id, { shouldValidate: true });
      toast.success('Client created and selected');
    }
  };

  const onSubmit = async (data) => {
    if (!isEditing && !data.ownerId) {
      setError('ownerId', { type: 'manual', message: 'Please select a project owner' });
      return;
    }
    const originalDeadline = project?.deadline ? project.deadline.slice(0, 10) : '';
    const deadlineChanged = isEditing && !!originalDeadline && originalDeadline !== (data.deadline || '');
    if (deadlineChanged && !data.reason?.trim()) {
      setError('reason', { type: 'manual', message: 'Please give a reason for changing the deadline.' });
      return;
    }
    clearErrors('reason');

    try {
      const payload = {
        title: data.title,
        client: data.client,
        ownerId: data.ownerId || undefined,
        description: data.description || undefined,
        priority: data.priority || 'medium',
        budget: data.budget || undefined,
        startDate: data.startDate || undefined,
        deadline: isEditing ? (data.deadline || '') : (data.deadline || undefined),
        reason: deadlineChanged ? data.reason.trim() : undefined,
        tags: data.tags
          ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      };

      if (isEditing) {
        await updateProject({ id: project._id, ...payload }).unwrap();
        toast.success('Project updated successfully');
        onSuccess?.();
      } else {
        await createProject(payload).unwrap();
        toast.success('Project created successfully');
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
            label="Project Title *"
            placeholder="Website Redesign"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <FormSelect
                name="client"
                control={control}
                label="Client *"
                options={clientOptions}
                placeholder={clientsLoading ? 'Loading clients...' : 'Select client'}
                error={errors.client?.message}
              />
            </div>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewClientModal(true)}
                className="mb-0.5"
              >
                <Plus className="w-4 h-4" /> New Client
              </Button>
            )}
          </div>
          {!isEditing && (
            <p className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
              <Building2 className="w-3.5 h-3.5" />
              Client not in the list? Create a new one — it will be selected automatically.
            </p>
          )}
        </div>

        <FormSelect
          name="ownerId"
          control={control}
          label={`Project Owner${isEditing ? '' : ' *'}`}
          options={ownerOptions}
          placeholder={usersLoading ? 'Loading staff...' : 'Select owner'}
          error={errors.ownerId?.message || (usersError ? 'Unable to load staff. Please try again.' : undefined)}
        />

        <FormSelect
          name="priority"
          control={control}
          label="Priority"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
          error={errors.priority?.message}
        />

        <FormInput
          label="Budget"
          type="number"
          placeholder="100000"
          error={errors.budget?.message}
          {...register('budget')}
        />

        <FormInput
          label="Start Date"
          type="date"
          error={errors.startDate?.message}
          {...register('startDate')}
        />

        <FormInput
          label="Deadline"
          type="date"
          error={errors.deadline?.message}
          {...register('deadline')}
        />

        {isEditing && (
          <div className="sm:col-span-2">
            <FormInput
              label="Deadline Change Reason"
              placeholder="Required when the project deadline changes"
              error={errors.reason?.message}
              {...register('reason')}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Only needed if you change the deadline. Saved in the activity log.
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
          <FormInput
            label="Tags"
            placeholder="web, design, react (comma separated)"
            error={errors.tags?.message}
            {...register('tags')}
          />
        </div>

        <div className="sm:col-span-2">
          <FormTextarea
            label="Description"
            placeholder="Project overview, goals, scope..."
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isCreating || isUpdating}>
          {isEditing ? 'Update Project' : 'Create Project'}
        </Button>
      </div>

      <Modal
        open={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        title="New Client"
        size="lg"
      >
        {/* React propagates portal events through the fiber tree, so the inner
            form's submit would also trigger the project form's onSubmit.
            Stop it here so only the client form handles its own submit. */}
        <div onSubmit={(e) => e.stopPropagation()}>
          <ClientForm onSuccess={handleClientCreated} onCancel={() => setShowNewClientModal(false)} />
        </div>
      </Modal>
    </form>
  );
}
