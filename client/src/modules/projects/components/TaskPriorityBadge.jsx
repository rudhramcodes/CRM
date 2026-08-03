const colors = {
  low: 'bg-zinc-100 text-zinc-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function TaskPriorityBadge({ priority }) {
  return (
    <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors[priority] || colors.medium}`}>
      {priority}
    </span>
  );
}
