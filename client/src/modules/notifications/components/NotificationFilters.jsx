import { cn } from '../../../utils/cn';

const TABS = [
  { label: 'All', value: undefined },
  { label: 'Unread', value: 'true' },
];

const QUICK_DATES = [
  { label: 'All Time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

function getDateRange(value) {
  const now = new Date();
  switch (value) {
    case 'today':
      return { startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { startDate: start.toISOString() };
    }
    case 'month':
      return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    default:
      return {};
  }
}

export default function NotificationFilters({ filters, onFilterChange }) {
  const activeTab = filters.read;

  const handleTabChange = (val) => {
    onFilterChange({ ...filters, read: val });
  };

  const handleDateChange = (val) => {
    const range = getDateRange(val);
    onFilterChange({ ...filters, ...range, _dateLabel: val });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-zinc-100">
      {/* Read/Unread Tabs */}
      <div className="flex items-center gap-1 bg-[#F6F0DF] rounded-lg p-0.5" role="group" aria-label="Notification read status filter">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            aria-pressed={activeTab === tab.value}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab.value
                ? 'bg-white text-[#3A2415] shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <span className="hidden text-zinc-300 text-xs sm:inline" aria-hidden="true">|</span>

      {/* Date Quick Filters */}
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Notification date filter">
        {QUICK_DATES.map((d) => (
          <button
            key={d.label}
            onClick={() => handleDateChange(d.value)}
            aria-pressed={filters._dateLabel === d.value || (!filters._dateLabel && d.value === '')}
            className={cn(
              'px-2.5 py-1.5 text-xs rounded-md transition-colors',
              filters._dateLabel === d.value || (!filters._dateLabel && d.value === '')
                ? 'bg-[#F6F0DF] text-[#3A2415] font-medium ring-1 ring-[#DCC19D]'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
