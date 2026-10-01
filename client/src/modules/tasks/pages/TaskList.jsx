import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  FolderKanban,
  LayoutList,
  CheckCircle2,
  CalendarDays,
  Plus,
  Clock,
  AlertCircle,
  Sparkles,
  Trash2,
  Check,
  ChevronDown,
  Download,
  BarChart2,
  Keyboard,
} from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import Button from '../../../components/ui/Button';
import TaskFilters from '../components/TaskFilters';
import TaskKanban from '../components/TaskKanban';
import TaskTable from '../components/TaskTable';
import TaskMyDay from '../components/TaskMyDay';
import TaskCalendar from '../components/TaskCalendar';
import TaskDrawer from '../components/TaskDrawer';
import TaskQuickAddModal from '../components/TaskQuickAddModal';
import TaskAnalyticsModal from '../components/TaskAnalyticsModal';
import TaskShortcutsModal from '../components/TaskShortcutsModal';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import { getSocket } from '../../../services/socket';
import { format } from 'date-fns';
import {
  useGetTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCreateTaskMutation,
  useBulkUpdateTasksMutation,
} from '../../../services/taskApi';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

export default function TaskList() {
  const { id: routeTaskId } = useParams();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [view, setView] = useState('kanban'); // 'kanban' | 'table' | 'my-day' | 'calendar'
  const [queryParams, setQueryParams] = useState(() => ({
    limit: 100,
    ...(projectParam ? { project: projectParam } : {}),
  }));
  const [selectedTaskId, setSelectedTaskId] = useState(routeTaskId || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    dispatch(setPageTitle('Tasks Hub'));
  }, [dispatch]);

  useEffect(() => {
    if (routeTaskId) {
      setSelectedTaskId(routeTaskId);
    }
  }, [routeTaskId]);

  const {
    data: tasksData,
    isLoading,
    refetch,
    isFetching,
  } = useGetTasksQuery(queryParams);

  // Real-time socket sync across team members
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = getSocket(token);

    const handleEntityUpdate = (payload) => {
      if (payload?.entityType === 'task' || payload?.entityType === 'project') {
        refetch();
      }
    };

    socket.on('entity:updated', handleEntityUpdate);
    return () => {
      socket.off('entity:updated', handleEntityUpdate);
    };
  }, [refetch]);

  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [createTask] = useCreateTaskMutation();
  const [bulkUpdateTasks] = useBulkUpdateTasksMutation();

  const tasks = useMemo(() => {
    return tasksData?.data?.tasks || (Array.isArray(tasksData?.data) ? tasksData.data : []) || [];
  }, [tasksData]);

  const handleFilterChange = useCallback((filters) => {
    setQueryParams((prev) => {
      const next = { limit: 100 };
      if (filters.search) next.search = filters.search;
      if (filters.project) next.project = filters.project;
      if (filters.priority) next.priority = filters.priority;
      if (filters.assignedTo) next.assignedTo = filters.assignedTo;
      if (filters.status) next.status = filters.status;
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(
    async (taskId, status) => {
      const targetTask = tasks.find((t) => t._id === taskId);
      if (status === 'done' && targetTask) {
        const isCreator = Boolean(
          user?._id &&
          targetTask.createdBy &&
          String(targetTask.createdBy._id || targetTask.createdBy) === String(user._id)
        );
        if (!isCreator) {
          toast.error(`Only the creator (${targetTask.createdBy?.name || 'task creator'}) can review and mark this task as completed.`);
          return;
        }
      }
      try {
        await updateTask({ id: taskId, status }).unwrap();
        toast.success(`Task moved to ${status.replace('_', ' ')}`);
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update status');
      }
    },
    [updateTask, tasks, user],
  );

  const handlePriorityChange = useCallback(
    async (taskId, priority) => {
      try {
        await updateTask({ id: taskId, priority }).unwrap();
        toast.success(`Priority set to ${priority}`);
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update priority');
      }
    },
    [updateTask],
  );

  const handleQuickAdd = useCallback(
    async ({ title, status = 'todo', dueDate }) => {
      try {
        await createTask({
          title,
          status,
          dueDate: dueDate || undefined,
        }).unwrap();
        toast.success('Task created');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to create task');
      }
    },
    [createTask],
  );

  const handleDeleteTask = useCallback(
    async (task) => {
      if (!window.confirm(`Delete task "${task.title}"?`)) return;
      try {
        await deleteTask(task._id).unwrap();
        toast.success('Task deleted');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete task');
      }
    },
    [deleteTask],
  );

  // Create Modal Defaults
  const [createModalConfig, setCreateModalConfig] = useState({
    defaultStatus: 'todo',
    defaultDueDate: '',
    defaultProject: 'none',
  });

  const handleOpenCreateModal = useCallback((defaults = {}) => {
    setCreateModalConfig({
      defaultStatus: defaults.status || 'todo',
      defaultDueDate: defaults.dueDate || '',
      defaultProject: defaults.project || 'none',
    });
    setShowCreateModal(true);
  }, []);

  const handleReschedule = useCallback(
    async (taskId, newDueDate) => {
      try {
        await updateTask({ id: taskId, dueDate: newDueDate }).unwrap();
        toast.success('Task rescheduled');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to reschedule task');
      }
    },
    [updateTask],
  );

  // Bulk actions
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === tasks.length) setSelectedIds([]);
    else setSelectedIds(tasks.map((t) => t._id));
  }, [selectedIds, tasks]);

  const handleBulkMarkDone = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const nonCreatedTasks = tasks.filter(
      (t) => selectedIds.includes(t._id) && String(t.createdBy?._id || t.createdBy) !== String(user?._id)
    );
    if (nonCreatedTasks.length > 0) {
      toast.error(`Only creators can mark tasks as Done (${nonCreatedTasks.length} task${nonCreatedTasks.length > 1 ? 's were' : ' was'} not created by you)`);
      return;
    }
    try {
      await bulkUpdateTasks({ ids: selectedIds, data: { status: 'done' } }).unwrap();
      toast.success(`${selectedIds.length} tasks marked as Done`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update tasks');
    }
  }, [selectedIds, tasks, user, bulkUpdateTasks]);

  const handleBulkChangeStatus = useCallback(
    async (status) => {
      if (selectedIds.length === 0) return;
      if (status === 'done') {
        const nonCreatedTasks = tasks.filter(
          (t) => selectedIds.includes(t._id) && String(t.createdBy?._id || t.createdBy) !== String(user?._id)
        );
        if (nonCreatedTasks.length > 0) {
          toast.error(`Only creators can mark tasks as Done (${nonCreatedTasks.length} task${nonCreatedTasks.length > 1 ? 's were' : ' was'} not created by you)`);
          return;
        }
      }
      try {
        await bulkUpdateTasks({ ids: selectedIds, data: { status } }).unwrap();
        toast.success(`Updated status for ${selectedIds.length} tasks`);
        setSelectedIds([]);
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update status');
      }
    },
    [selectedIds, tasks, user, bulkUpdateTasks],
  );

  const handleBulkChangePriority = useCallback(
    async (priority) => {
      if (selectedIds.length === 0) return;
      try {
        await bulkUpdateTasks({ ids: selectedIds, data: { priority } }).unwrap();
        toast.success(`Updated priority for ${selectedIds.length} tasks`);
        setSelectedIds([]);
      } catch (err) {
        toast.error('Failed to update priority');
      }
    },
    [selectedIds, bulkUpdateTasks],
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected tasks? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteTask(id).unwrap()));
      toast.success(`${selectedIds.length} tasks deleted`);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete some tasks');
    }
  }, [selectedIds, deleteTask]);

  // CSV Export
  const handleExportCSV = useCallback(() => {
    const targetTasks = selectedIds.length > 0
      ? tasks.filter((t) => selectedIds.includes(t._id))
      : tasks;

    if (targetTasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }

    const headers = [
      'ID',
      'Title',
      'Status',
      'Priority',
      'Project',
      'Assignee',
      'Due Date',
      'Estimated Hours',
      'Actual Hours',
      'Checklist Progress',
      'Tags',
      'Created At',
    ];

    const rows = targetTasks.map((t) => [
      t._id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      `"${(t.project?.title || 'General').replace(/"/g, '""')}"`,
      `"${(t.assignedTo?.name || 'Unassigned').replace(/"/g, '""')}"`,
      t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
      t.estimatedHours || 0,
      t.actualHours || 0,
      `${t.checklists?.filter((c) => c.checked).length || 0}/${t.checklists?.length || 0}`,
      `"${(t.tags || []).join(', ')}"`,
      t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks-export-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${targetTasks.length} tasks to CSV`);
  }, [tasks, selectedIds]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contentEditable element
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === 'c' || e.key === 'C' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowCreateModal(true);
      } else if (e.key === '1') {
        e.preventDefault();
        setView('kanban');
      } else if (e.key === '2') {
        e.preventDefault();
        setView('table');
      } else if (e.key === '3') {
        e.preventDefault();
        setView('my-day');
      } else if (e.key === '4') {
        e.preventDefault();
        setView('calendar');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowAnalyticsModal(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // KPI stats
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const kpis = [
    { title: 'Total Tasks', value: totalCount, desc: 'Across active scopes', icon: FolderKanban, color: 'text-zinc-700 bg-zinc-100' },
    { title: 'In Progress', value: inProgressCount, desc: 'Actively in flight', icon: Clock, color: 'text-blue-600 bg-blue-50' },
    { title: 'Overdue / Alerts', value: overdueCount, desc: 'Needs fast focus', icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
    { title: 'Completed', value: doneCount, desc: 'Closed deliverables', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="relative space-y-6 pb-16">
      {/* Antigravity Ambient Dot Matrix Glow Background */}
      <div
        className="pointer-events-none absolute -inset-x-4 -top-6 h-80 -z-10 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.28) 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 0%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 0%, #000 60%, transparent 100%)',
        }}
      />

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
            Task Operations
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Coordinate pipelines, daily checkpoints, and project milestones
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-zinc-100/90 rounded-xl p-1 border border-zinc-200/80 shadow-2xs overflow-x-auto">
            {[
              { id: 'kanban', label: 'Kanban', icon: FolderKanban },
              { id: 'table', label: 'List', icon: LayoutList },
              { id: 'my-day', label: 'My Day', icon: CheckCircle2 },
              { id: 'calendar', label: 'Calendar', icon: CalendarDays },
            ].map((v) => {
              const Icon = v.icon;
              const isSelected = view === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                    isSelected
                      ? 'bg-white text-primary-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800',
                  )}
                  title={`${v.label} view`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Insights Button */}
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-primary-900 hover:bg-zinc-100 transition-colors border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="Insights & Velocity Analytics (I)"
          >
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Insights</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-primary-900 hover:bg-zinc-100 transition-colors border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title={selectedIds.length > 0 ? `Export ${selectedIds.length} Selected Tasks to CSV` : 'Export Tasks to CSV'}
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Refresh Action */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50 border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="Refresh tasks"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* New Task CTA */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl text-xs font-semibold shadow-md shadow-primary-900/10 shrink-0"
          >
            <Plus className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white/80 backdrop-blur-xs rounded-2xl border border-zinc-200/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 flex flex-col justify-between group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-600 transition-colors">
                  {kpi.title}
                </span>
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-110',
                    kpi.color,
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-900 tracking-tight">
                  {kpi.value}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 truncate font-normal">
                  {kpi.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <TaskFilters
        onFilterChange={handleFilterChange}
        currentUserId={user?._id}
        initialProject={projectParam || ''}
      />

      {/* Bulk Selection Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 text-xs font-semibold animate-in slide-in-from-bottom-3 border border-zinc-700/60 max-w-[95vw] overflow-x-auto">
          <span className="whitespace-nowrap px-2 py-1 bg-white/10 rounded-lg text-[11px] text-zinc-300">
            {selectedIds.length} selected
          </span>

          {/* Quick Mark Done */}
          <button
            type="button"
            onClick={handleBulkMarkDone}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title="Mark all selected tasks as Done"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark Done</span>
          </button>

          {/* Bulk Status Select */}
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleBulkChangeStatus(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
          >
            <option value="" disabled>Status...</option>
            {TASK_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Bulk Priority Select */}
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleBulkChangePriority(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
          >
            <option value="" disabled>Priority...</option>
            {TASK_PRIORITY.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Bulk Delete */}
          <button
            type="button"
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            title="Delete selected tasks"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Deselect */}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-1 text-xs whitespace-nowrap"
          >
            Clear
          </button>
        </div>
      )}

      {/* Main Views Render */}
      {view === 'kanban' && (
        <TaskKanban
          tasks={tasks}
          onTaskClick={(t) => setSelectedTaskId(t._id)}
          onStatusChange={handleStatusChange}
          onQuickAdd={handleQuickAdd}
          onDelete={handleDeleteTask}
          onOpenCreateModal={handleOpenCreateModal}
        />
      )}

      {view === 'table' && (
        <TaskTable
          tasks={tasks}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onTaskClick={(t) => setSelectedTaskId(t._id)}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onDelete={handleDeleteTask}
        />
      )}

      {view === 'my-day' && (
        <TaskMyDay
          tasks={tasks}
          onTaskClick={(t) => setSelectedTaskId(t._id)}
          onStatusChange={handleStatusChange}
          onQuickAdd={handleQuickAdd}
          onReschedule={handleReschedule}
          onOpenCreateModal={handleOpenCreateModal}
        />
      )}

      {view === 'calendar' && (
        <TaskCalendar
          tasks={tasks}
          onTaskClick={(t) => setSelectedTaskId(t._id)}
          onStatusChange={handleStatusChange}
          onOpenCreateModal={handleOpenCreateModal}
        />
      )}

      {/* Slide-over Task Inspector Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onClose={() => {
          setSelectedTaskId(null);
          if (routeTaskId) navigate('/tasks', { replace: true });
        }}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      {/* Quick Add Modal */}
      <TaskQuickAddModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultStatus={createModalConfig.defaultStatus}
        defaultDueDate={createModalConfig.defaultDueDate}
        defaultProject={createModalConfig.defaultProject}
        onSuccess={() => refetch()}
      />

      {/* Operations & Velocity Analytics Modal */}
      <TaskAnalyticsModal
        open={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        tasks={tasks}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <TaskShortcutsModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
