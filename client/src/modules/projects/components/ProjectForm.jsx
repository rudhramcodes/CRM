import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import Button from '../../../components/ui/Button';
import { PROJECT_STATUS } from '../../../constants';
import { useCreateProjectMutation, useUpdateProjectMutation } from '../../../services/projectApi';

const projectFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    description: z.string().max(2000).optional().or(z.literal('')),
    status: z.string().optional(),
    priority: z.string().optional(),
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      budget: '',
      startDate: '',
      deadline: '',
      tags: '',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        budget: project.budget || '',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        tags: project.tags?.join(', ') || '',
      });
    }
  }, [project, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        status: data.status || 'planning',
        priority: data.priority || 'medium',
        budget: data.budget || undefined,
        startDate: data.startDate || undefined,
        deadline: data.deadline || undefined,
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

        <FormSelect
          name="status"
          control={control}
          label="Status"
          options={PROJECT_STATUS}
          error={errors.status?.message}
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
    </form>
  );
}
