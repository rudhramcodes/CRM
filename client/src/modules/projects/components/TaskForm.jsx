import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import Button from '../../../components/ui/Button';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import { useGetProjectByIdQuery } from '../../../services/projectApi';

const taskFormSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().optional().or(z.literal('')),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional().or(z.literal('')),
  project: z.string().min(1, 'Project is required'),
  milestone: z.string().optional().or(z.literal('none')),
  dueDate: z.string().optional().or(z.literal('')),
  estimatedHours: z.coerce.number().min(0).optional().or(z.literal('')),
  tags: z.string().optional(),
});

export default function TaskForm({ initialData, projects = [], users = [], defaultProject = '', onSubmit, onCancel, loading }) {
  const formValues = useMemo(() => initialData ? ({
    title: initialData.title || '',
    description: initialData.description || '',
    status: initialData.status || 'todo',
    priority: initialData.priority || 'medium',
    assignedTo: initialData.assignedTo?._id || initialData.assignedTo || '',
    project: initialData.project?._id || initialData.project || '',
    milestone: initialData.milestone || 'none',
    dueDate: initialData.dueDate ? initialData.dueDate.slice(0, 10) : '',
    estimatedHours: initialData.estimatedHours || '',
    tags: initialData.tags?.join(', ') || '',
  }) : {
    title: '', description: '', status: 'todo', priority: 'medium',
    assignedTo: '', project: defaultProject || '', milestone: 'none', dueDate: '', estimatedHours: '', tags: '',
  }, [initialData, defaultProject]);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(taskFormSchema),
    values: formValues,
  });

  const selectedProject = useWatch({ control, name: 'project' });
  const { data: projectData } = useGetProjectByIdQuery(selectedProject || '', { skip: !selectedProject });
  const milestoneOptions = (projectData?.data?.project?.milestones || []).map((m) => ({ value: m._id, label: m.title }));

  const handleFormSubmit = (data) => {
    const payload = {
      ...data,
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : 0,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      assignedTo: data.assignedTo || undefined,
      project: data.project,
      milestone: data.milestone === 'none' ? (initialData ? null : undefined) : data.milestone,
      dueDate: data.dueDate || undefined,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <FormInput label="Title" {...register('title')} error={errors.title?.message} placeholder="Enter task title" />
      <FormTextarea label="Description" {...register('description')} error={errors.description?.message} placeholder="Optional description" rows={3} />
      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Status" control={control} name="status" options={TASK_STATUS.map((s) => ({ value: s.value, label: s.label }))} />
        <FormSelect label="Priority" control={control} name="priority" options={TASK_PRIORITY.map((p) => ({ value: p.value, label: p.label }))} />
      </div>
      <FormSelect label="Assignee" control={control} name="assignedTo"
        options={[{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: u._id, label: u.name }))]} />
      <FormSelect label="Project" control={control} name="project"
        options={projects.map((p) => ({ value: p._id, label: p.title }))} error={errors.project?.message} />
      <FormSelect label="Milestone" control={control} name="milestone"
        options={[{ value: 'none', label: 'No Milestone' }, ...milestoneOptions]} />
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Due Date" type="date" {...register('dueDate')} />
        <FormInput label="Est. Hours" type="number" step="0.5" {...register('estimatedHours')} error={errors.estimatedHours?.message} />
      </div>
      <FormInput label="Tags (comma-separated)" {...register('tags')} placeholder="e.g. frontend, bug, urgent" />
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={loading}>{initialData ? 'Update Task' : 'Create Task'}</Button>
      </div>
    </form>
  );
}
