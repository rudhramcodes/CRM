const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-zinc-100 text-zinc-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

export default function ProjectPriorityBadge({ priority }) {
  const config = PRIORITIES.find((p) => p.value === priority);
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
