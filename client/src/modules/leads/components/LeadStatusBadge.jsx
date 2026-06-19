import { LEAD_STATUS } from '../../../constants';
import { cn } from '../../../utils/cn';

const statusStyles = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  meeting_scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  proposal_sent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels = LEAD_STATUS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {},
);

export default function LeadStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status] || statusStyles.new,
        className,
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
