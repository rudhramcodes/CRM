import { CLIENT_STATUS } from '../../../constants';
import { cn } from '../../../utils/cn';

const statusStyles = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels = CLIENT_STATUS.reduce(
  (acc, s) => ({ ...acc, [s.value]: s.label }),
  {},
);

export default function ClientStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status] || statusStyles.active,
        className,
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
