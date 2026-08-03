const colors = {
  todo: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
};

const labels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function TaskStatusBadge({ status }) {
  return (
    <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors[status] || colors.todo}`}>
      {labels[status] || status}
    </span>
  );
}
