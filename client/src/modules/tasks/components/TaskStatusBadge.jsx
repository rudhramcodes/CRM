import { TASK_STATUS } from '../../../constants';

export default function TaskStatusBadge({ status }) {
  const c = TASK_STATUS.find((s) => s.value === status);
  if (!c) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}
