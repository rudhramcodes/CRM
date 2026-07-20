import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import FormInput from '../../../components/forms/FormInput';
import FormTextarea from '../../../components/forms/FormTextarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import DatePicker from '../../../components/forms/DatePicker';
import Button from '../../../components/ui/Button';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';

const taskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  project: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).optional(),
});

export default function TaskForm({ initialData, projects = [], users = [], onSubmit, onCancel, loading }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'todo',
      priority: initialData?.priority || 'medium',
      assignedTo: initialData?.assignedTo?._id || '',
      project: initialData?.project?._id || '',
      dueDate: initialData?.dueDate || '',
      estimatedHours: initialData?.estimatedHours || 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput label="Title" {...register('title')} error={errors.title?.message} placeholder="Enter task title" />

      <FormTextarea label="Description" {...register('description')} error={errors.description?.message} placeholder="Optional description" rows={3} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-500">Status</label>
          <Controller name="status" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full h-auto py-2 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-500">Priority</label>
          <Controller name="priority" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full h-auto py-2 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_PRIORITY.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-500">Assigned To</label>
          <Controller name="assignedTo" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full h-auto py-2 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {(users || []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-500">Project</label>
          <Controller name="project" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full h-auto py-2 text-sm"><SelectValue placeholder="No project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {(projects || []).map((p) => <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Controller name="dueDate" control={control} render={({ field }) => (
          <DatePicker value={field.value} onChange={field.onChange} label="Due Date" />
        )} />

        <FormInput label="Estimated Hours" type="number" min="0" step="0.5" {...register('estimatedHours')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{initialData ? 'Update Task' : 'Create Task'}</Button>
      </div>
    </form>
  );
}
