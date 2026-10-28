import { QUOTATION_STATUS } from '../../../constants';

const statusMap = QUOTATION_STATUS.reduce((map, s) => {
  map[s.value] = s;
  return map;
}, {});

export default function QuotationStatusBadge({ status }) {
  const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}
