import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import AttendanceWidget from '../components/AttendanceWidget';
import CalendarGrid from '../components/CalendarGrid';
import DayDetailPanel from '../components/DayDetailPanel';
import AttendanceStats from '../components/AttendanceStats';
import ManualEntryModal from '../components/ManualEntryModal';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import { ChevronLeft, ChevronRight, Pencil, LayoutGrid, Rows3 } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, isSameMonth, isWithinInterval } from 'date-fns';

const weekOpts = { weekStartsOn: 0 };

function alignSelectedDate(anchor, mode, selected) {
  if (mode === 'week') {
    const start = startOfWeek(anchor, weekOpts);
    const end = endOfWeek(anchor, weekOpts);
    if (!isWithinInterval(selected, { start, end })) return start;
    return selected;
  }
  if (!isSameMonth(selected, anchor)) {
    const now = new Date();
    if (isSameMonth(now, anchor)) return now;
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  }
  return selected;
}

export default function AttendanceCalendar() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [viewMode, setViewMode] = useState('month');

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  useEffect(() => {
    dispatch(setPageTitle('Attendance'));
  }, [dispatch]);

  const goTo = (nextAnchor) => {
    setCurrentMonth(nextAnchor);
    setSelectedDate((sel) => alignSelectedDate(nextAnchor, viewMode, sel));
  };

  const prevMonth = () => {
    if (viewMode === 'week') {
      goTo(subWeeks(currentMonth, 1));
    } else {
      goTo(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };

  const nextMonth = () => {
    if (viewMode === 'week') {
      goTo(addWeeks(currentMonth, 1));
    } else {
      goTo(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewMode('month');
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  const switchView = (mode) => {
    setViewMode(mode);
    setSelectedDate((sel) => alignSelectedDate(currentMonth, mode, sel));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Attendance</h2>
          <p className="text-sm text-zinc-500 mt-1">Track your daily attendance and work hours</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setShowManualEntry(true)}>
            <Pencil className="w-4 h-4" />
            Manual Entry
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AttendanceWidget />

          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-semibold text-primary-900">
                  {viewMode === 'week'
                    ? `${format(startOfWeek(currentMonth, weekOpts), 'dd MMM')} — ${format(endOfWeek(currentMonth, weekOpts), 'dd MMM yyyy')}`
                    : format(currentMonth, 'MMMM yyyy')}
                </h3>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="ml-1 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => switchView('month')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-white text-primary-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => switchView('week')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-white text-primary-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                  Week
                </button>
              </div>
            </div>
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              employeeId={user?._id}
              viewMode={viewMode}
            />
          </div>
        </div>

        <div className="space-y-6">
          <DayDetailPanel date={selectedDate} employeeId={user?._id} />
          <AttendanceStats employeeId={user?._id} monthDate={currentMonth} />
        </div>
      </div>

      <ManualEntryModal open={showManualEntry} onClose={() => setShowManualEntry(false)} />
    </div>
  );
}
