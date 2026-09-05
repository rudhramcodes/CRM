import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  ListTodo,
  MapPin,
  Milestone,
  Video,
  X,
} from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import { useGetTasksQuery } from '../services/taskApi';
import { useGetMeetingsQuery } from '../services/meetingApi';
import { useGetAttendanceCalendarQuery, useGetHolidaysQuery, useGetLeavesQuery } from '../services/attendanceApi';

const FILTERS = [
  { key: 'all', label: 'All', color: 'bg-zinc-900' },
  { key: 'task', label: 'Tasks', color: 'bg-indigo-500' },
  { key: 'deadline', label: 'Deadlines', color: 'bg-rose-500' },
  { key: 'meeting', label: 'Meetings', color: 'bg-violet-500' },
  { key: 'attendance', label: 'Attendance', color: 'bg-emerald-500' },
  { key: 'leave', label: 'Leave', color: 'bg-amber-500' },
  { key: 'holiday', label: 'Holidays', color: 'bg-sky-500' },
];

const EVENT_META = {
  task: { label: 'Task', icon: ListTodo, dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  deadline: { label: 'Deadline', icon: Flag, dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
  meeting: { label: 'Meeting', icon: Video, dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-100' },
  attendance: { label: 'Attendance', icon: Clock3, dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  leave: { label: 'Leave', icon: BriefcaseBusiness, dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  holiday: { label: 'Holiday', icon: CalendarDays, dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-100' },
};

const unwrap = (payload, keys = []) => {
  const data = payload?.data ?? payload ?? {};
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const dateKey = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd');
};

const toTimeLabel = (time) => {
  if (!time) return '';
  const [hour, minute] = String(time).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return format(date, 'h:mm a');
};

function eventMatchesFilter(event, filter) {
  return filter === 'all' || event.type === filter;
}

function EventPill({ event, compact = false, onClick }) {
  const meta = EVENT_META[event.type] || EVENT_META.task;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(event); }}
      className={`group flex w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${meta.badge}`}
      title={event.title}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {!compact && <Icon className="h-3 w-3 shrink-0 opacity-70" />}
      <span className="min-w-0 truncate text-[10px] font-medium">{event.title}</span>
    </button>
  );
}

export default function EmployeeWorkCalendar() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;
  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

  const { data: tasksData, isFetching: tasksLoading } = useGetTasksQuery({ limit: 100, page: 1 });
  const { data: meetingsData, isFetching: meetingsLoading } = useGetMeetingsQuery({ limit: 100, page: 1 });
  const { data: attendanceData, isFetching: attendanceLoading } = useGetAttendanceCalendarQuery(
    { employeeId: user?._id, year, month: monthNumber },
    { skip: !user?._id },
  );
  const { data: holidaysData, isFetching: holidaysLoading } = useGetHolidaysQuery({ year, page: 1, limit: 100 });
  const { data: leavesData, isFetching: leavesLoading } = useGetLeavesQuery({ page: 1, limit: 100, dateFrom: monthStart, dateTo: monthEnd });

  const events = useMemo(() => {
    const result = [];
    const tasks = unwrap(tasksData, ['tasks']);
    tasks.forEach((task) => {
      const due = dateKey(task.dueDate);
      if (!due) return;
      result.push({ id: `task-${task._id}`, sourceId: task._id, type: 'task', date: due, title: task.title || 'Untitled task', detail: `${task.status?.replace('_', ' ') || 'To do'}${task.priority ? ` · ${task.priority} priority` : ''}`, task, action: 'task' });
      result.push({ id: `deadline-${task._id}`, sourceId: task._id, type: 'deadline', date: due, title: task.title || 'Task deadline', detail: task.status === 'done' ? 'Completed' : 'Due date', task, action: 'task' });
    });

    const meetings = unwrap(meetingsData, ['meetings']);
    meetings.forEach((meeting) => {
      const date = dateKey(meeting.date);
      if (!date) return;
      result.push({ id: `meeting-${meeting._id}`, sourceId: meeting._id, type: 'meeting', date, title: meeting.title || 'Meeting', detail: `${toTimeLabel(meeting.startTime)}${meeting.endTime ? ` – ${toTimeLabel(meeting.endTime)}` : ''}`, meeting, action: 'meeting' });
    });

    const attendance = unwrap(attendanceData, ['records']);
    attendance.forEach((record) => {
      const date = dateKey(record.date);
      if (!date) return;
      const firstIn = record.sessions?.[0]?.clockIn?.time || record.clockIn?.time;
      result.push({ id: `attendance-${record._id}`, sourceId: record._id, type: 'attendance', date, title: record.status?.replace('_', ' ') || 'Attendance', detail: firstIn ? `In ${format(new Date(firstIn), 'h:mm a')}` : 'No clock-in', record });
    });

    const holidays = unwrap(holidaysData, ['holidays']);
    holidays.forEach((holiday) => {
      const date = dateKey(holiday.date);
      if (date) result.push({ id: `holiday-${holiday._id}`, sourceId: holiday._id, type: 'holiday', date, title: holiday.name || 'Company holiday', detail: 'Office holiday', holiday });
    });

    const leaves = unwrap(leavesData, ['leaves']);
    leaves.forEach((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate || leave.startDate);
      if (Number.isNaN(start.getTime())) return;
      for (const day of eachDayOfInterval({ start, end })) {
        const date = dateKey(day);
        if (date >= monthStart && date <= monthEnd) result.push({ id: `leave-${leave._id}-${date}`, sourceId: leave._id, type: 'leave', date, title: `${leave.leaveType?.replace('_', ' ') || 'Leave'}`, detail: leave.status || 'Pending', leave });
      }
    });
    return result;
  }, [attendanceData, holidaysData, leavesData, meetingsData, monthEnd, monthStart, tasksData]);

  const visibleEvents = useMemo(() => events.filter((event) => eventMatchesFilter(event, activeFilter)), [activeFilter, events]);
  const eventsByDate = useMemo(() => visibleEvents.reduce((map, event) => {
    if (!map[event.date]) map[event.date] = [];
    map[event.date].push(event);
    return map;
  }, {}), [visibleEvents]);
  const selectedEvents = events.filter((event) => event.date === dateKey(selectedDate));
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month]);
  const loading = tasksLoading || meetingsLoading || attendanceLoading || holidaysLoading || leavesLoading;

  const changeMonth = (nextMonth) => {
    setMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  const openEvent = (event) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(`${event.date}T12:00:00`));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-gradient-to-br from-[#fbfaf7] via-white to-indigo-50/30 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              <Milestone className="h-3.5 w-3.5" /> My work calendar
            </div>
            <h3 className="font-heading text-xl font-semibold text-primary-900">Plan your month at a glance</h3>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">Deadlines, meetings, attendance and leave in one calm workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => changeMonth(new Date())}>Today</Button>
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
              <button type="button" aria-label="Previous month" onClick={() => changeMonth(subMonths(month, 1))} className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[126px] px-2 text-center text-sm font-semibold text-zinc-800">{format(month, 'MMMM yyyy')}</span>
              <button type="button" aria-label="Next month" onClick={() => changeMonth(addMonths(month, 1))} className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button type="button" key={filter.key} onClick={() => setActiveFilter(filter.key)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${activeFilter === filter.key ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}>
              {filter.key !== 'all' && <span className={`h-1.5 w-1.5 rounded-full ${filter.color}`} />}{filter.label}
            </button>
          ))}
          {loading && <span className="ml-auto text-xs text-zinc-400">Syncing your calendar…</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 p-3 sm:p-5">
          <div className="grid grid-cols-7 border-b border-zinc-100 pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-400 sm:text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[key] || [];
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button type="button" key={key} onClick={() => { setSelectedDate(day); setSelectedEvent(null); }} className={`group min-h-[92px] rounded-xl border p-1.5 text-left transition-all sm:min-h-[122px] sm:p-2 ${isSameMonth(day, month) ? 'border-zinc-100 bg-white' : 'border-transparent bg-zinc-50/50 text-zinc-300'} ${isSelected ? 'border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-100' : 'hover:border-zinc-200 hover:bg-zinc-50'} ${isToday(day) ? 'shadow-[inset_0_2px_0_0_#4f46e5]' : ''}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday(day) ? 'bg-indigo-600 text-white' : isSameMonth(day, month) ? 'text-zinc-700' : 'text-zinc-300'}`}>{format(day, 'd')}</span>
                    {dayEvents.length > 0 && <span className="text-[10px] text-zinc-400">{dayEvents.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => <EventPill key={event.id} event={event} compact={false} onClick={openEvent} />)}
                    {dayEvents.length > 3 && <span className="block px-1 text-[10px] font-medium text-zinc-400">+{dayEvents.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-zinc-100 bg-[#fcfcfb] p-4 lg:border-l lg:border-t-0 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Selected day</p>
              <h4 className="mt-1 text-base font-semibold text-zinc-900">{format(selectedDate, 'EEEE, d MMM')}</h4>
            </div>
            {selectedEvents.length > 0 && <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500">{selectedEvents.length} items</span>}
          </div>
          <div className="space-y-2">
            {selectedEvents.length > 0 ? selectedEvents.map((event) => (
              <button type="button" key={event.id} onClick={() => openEvent(event)} className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm">
                <div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 rounded-full ${EVENT_META[event.type]?.dot || 'bg-zinc-400'}`} /><div className="min-w-0"><p className="truncate text-sm font-medium capitalize text-zinc-800">{event.title}</p><p className="mt-1 text-xs capitalize text-zinc-500">{event.detail}</p></div></div>
              </button>
            )) : <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center"><CalendarDays className="mx-auto h-7 w-7 text-zinc-300" /><p className="mt-2 text-sm font-medium text-zinc-500">Nothing scheduled</p><p className="mt-1 text-xs text-zinc-400">A clear day is a good day to make progress.</p></div>}
          </div>
          <div className="mt-6 border-t border-zinc-200/70 pt-4"><p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Quick view</p><div className="space-y-2 text-xs text-zinc-600"><div className="flex items-center justify-between"><span>Tasks this month</span><strong className="text-zinc-900">{events.filter((event) => event.type === 'task').length}</strong></div><div className="flex items-center justify-between"><span>Upcoming deadlines</span><strong className="text-rose-600">{events.filter((event) => event.type === 'deadline').length}</strong></div><div className="flex items-center justify-between"><span>Meetings</span><strong className="text-violet-600">{events.filter((event) => event.type === 'meeting').length}</strong></div></div></div>
        </aside>
      </div>

      <Drawer open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title || 'Calendar details'} size="md">
        {selectedEvent && <div className="space-y-5">
          <div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${EVENT_META[selectedEvent.type]?.badge}`}>{EVENT_META[selectedEvent.type]?.label}</span>{selectedEvent.detail && <span className="text-xs capitalize text-zinc-500">{selectedEvent.detail}</span>}</div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4"><p className="text-xs font-medium uppercase tracking-wider text-zinc-400">When</p><p className="mt-1 text-sm font-semibold text-zinc-800">{format(new Date(`${selectedEvent.date}T12:00:00`), 'EEEE, d MMMM yyyy')}</p>{selectedEvent.type === 'meeting' && <p className="mt-1 text-sm text-zinc-500">{selectedEvent.detail}</p>}</div>
          {selectedEvent.type === 'task' || selectedEvent.type === 'deadline' ? <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-zinc-600"><Flag className="h-4 w-4 text-rose-500" />{selectedEvent.task?.priority || 'Normal'} priority</div><div className="flex items-center gap-2 text-sm text-zinc-600"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{selectedEvent.task?.status?.replace('_', ' ') || 'To do'}</div></div> : selectedEvent.type === 'attendance' ? <div className="space-y-3 text-sm text-zinc-600"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-500" />{selectedEvent.record?.status?.replace('_', ' ') || 'Attendance recorded'}</div>{selectedEvent.record?.shift?.name && <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-zinc-400" />{selectedEvent.record.shift.name}</div>}</div> : selectedEvent.type === 'meeting' ? <div className="space-y-3 text-sm text-zinc-600">{selectedEvent.meeting?.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" />{selectedEvent.meeting.location}</div>}{selectedEvent.meeting?.meetingLink && <a href={selectedEvent.meeting.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-indigo-600 hover:text-indigo-700"><Video className="h-4 w-4" />Join meeting</a>}</div> : <p className="text-sm capitalize text-zinc-600">{selectedEvent.detail}</p>}
          <div className="flex flex-wrap gap-2">{selectedEvent.action === 'meeting' && <Button onClick={() => navigate(`/meetings/${selectedEvent.sourceId}`)}>Open meeting <ArrowRight className="h-4 w-4" /></Button>}{selectedEvent.action === 'task' && <Button variant="secondary" onClick={() => navigate('/projects')}>Open task area <ArrowRight className="h-4 w-4" /></Button>}<Button variant="ghost" onClick={() => setSelectedEvent(null)}><X className="h-4 w-4" />Close</Button></div>
        </div>}
      </Drawer>
    </section>
  );
}
