import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../../components/ui/Modal';
import FormInput from '../../../components/forms/FormInput';
import FormSelect from '../../../components/forms/FormSelect';
import FormTextarea from '../../../components/forms/FormTextarea';
import DatePicker from '../../../components/forms/DatePicker';
import Button from '../../../components/ui/Button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { useCreateTaskMutation } from '../../../services/taskApi';
import toast from 'react-hot-toast';

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().optional().or(z.literal('')),
  project: z.string().optional().or(z.literal('none')),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
  assignedTo: z.string().optional().or(z.literal('none')),
  dueDate: z.string().optional().or(z.literal('')),
  estimatedHours: z.coerce.number().min(0).optional().or(z.literal('')),
});

export default function TaskQuickAddModal({
  open,
  onClose,
  defaultStatus = 'todo',
  defaultDueDate = '',
  defaultProject = 'none',
  onSuccess,
}) {
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 }, { skip: !open });
  const { data: usersData } = useGetUsersQuery({ limit: 100 }, { skip: !open });
  const [createTask, { isLoading }] = useCreateTaskMutation();

  const projects = projectsData?.data?.projects || projectsData?.data || [];
  const users = usersData?.data?.users || (Array.isArray(usersData?.data) ? usersData.data : []) || [];

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState('weekly');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      project: defaultProject || 'none',
      status: defaultStatus || 'todo',
      priority: 'medium',
      assignedTo: 'none',
      dueDate: defaultDueDate || '',
      estimatedHours: '',
    },
  });

  // Re-sync default values when modal opens
  useEffect(() => {
    if (open) {
      setIsRecurring(false);
      reset({
        title: '',
        description: '',
        project: defaultProject || 'none',
        status: defaultStatus || 'todo',
        priority: 'medium',
        assignedTo: 'none',
        dueDate: defaultDueDate || '',
        estimatedHours: '',
      });
    }
  }, [open, defaultStatus, defaultDueDate, defaultProject, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        status: values.status,
        priority: values.priority,
        project: values.project === 'none' ? undefined : values.project,
        assignedTo: values.assignedTo === 'none' ? undefined : values.assignedTo,
        dueDate: values.dueDate || undefined,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : 0,
        recurring: isRecurring
          ? {
              enabled: true,
              frequency: recurringFreq,
            }
          : undefined,
      };

      await createTask(payload).unwrap();
      toast.success('Task created successfully');
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create task');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Task" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="Task Title *"
          placeholder="e.g. Design responsive client portal timeline cards"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Project */}
          <FormSelect
            name="project"
            control={control}
            label="Associated Project"
            options={[
              { value: 'none', label: 'None (Standalone / General)' },
              ...projects.map((p) => ({ value: p._id, label: p.title })),
            ]}
            error={errors.project?.message}
          />

          {/* Assignee */}
          <FormSelect
            name="assignedTo"
            control={control}
            label="Assigned Member"
            options={[
              { value: 'none', label: 'Unassigned' },
              ...users.map((u) => ({ value: u._id, label: u.name })),
            ]}
            error={errors.assignedTo?.message}
          />

          {/* Status */}
          <FormSelect
            name="status"
            control={control}
            label="Initial Status"
            options={TASK_STATUS}
            error={errors.status?.message}
          />

          {/* Priority */}
          <FormSelect
            name="priority"
            control={control}
            label="Priority Level"
            options={TASK_PRIORITY}
            error={errors.priority?.message}
          />

          {/* Due Date */}
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Due Date"
                value={field.value}
                onChange={field.onChange}
                error={errors.dueDate?.message}
              />
            )}
          />

          {/* Estimated Hours */}
          <FormInput
            type="number"
            label="Estimated Effort (Hours)"
            placeholder="e.g. 4"
            error={errors.estimatedHours?.message}
            {...register('estimatedHours')}
          />
        </div>

        <FormTextarea
          rows={3}
          label="Description / Context"
          placeholder="Add instructions, checklist bullet points, or reference links..."
          error={errors.description?.message}
          {...register('description')}
        />

        {/* Recurring Task Option */}
        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700 select-none">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
            />
            <span>Recurring Automation</span>
          </label>

          {isRecurring && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-medium">Repeats:</span>
              <Select value={recurringFreq} onValueChange={setRecurringFreq}>
                <SelectTrigger className="h-8 w-28 text-xs font-medium rounded-xl bg-white border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} className="rounded-xl bg-primary-900 text-white">
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
