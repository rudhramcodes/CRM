import { MEETING_STATUS } from '../../../constants';

export default function MeetingStatusBadge({ status }) {
  const config = MEETING_STATUS.find((s) => s.value === status);
  if (!config) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
