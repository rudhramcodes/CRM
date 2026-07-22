import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, CheckSquare, Columns, LayoutList, AlertTriangle, X, Download } from 'lucide-react';
import {
  useGetTasksQuery,
  useGetTaskStatsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useBulkUpdateTasksMutation,
  useReorderTasksMutation,
} from '../../../services/taskApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { useGetProjectsQuery } from '../../../services/projectApi';
import TaskTable from '../components/TaskTable';
import TaskKanbanBoard from '../components/TaskKanbanBoard';
import TaskFilters from '../components/TaskFilters';
import TaskForm from '../components/TaskForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { TASK_STATUS } from '../../../constants';
import toast from 'react-hot-toast';

export default function TaskList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const [queryParams, setQueryParams] = useState(() => {
    const params = {};
    const project = searchParams.get('project');
    if (project) params.project = project;
    return params;
  });
  const [viewMode, setViewMode] = useState('table');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => { dispatch(setPageTitle('Tasks')); }, [dispatch]);

  const { data, isLoading, error } = useGetTasksQuery(queryParams);
  const { data: statsData, isLoading: statsLoading } = useGetTaskStatsQuery();
  const { data: usersData } = useGetUsersQuery({ limit: 100 }, { skip: !['super_admin', 'admin', 'manager'].includes(user?.role) });
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });

  const tasks = data?.data || [];
  const pagination = data?.pagination;
  const stats = statsData?.data || {};
  const users = usersData?.data?.users || [];
  const projects = projectsData?.data || [];

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [bulkUpdate] = useBulkUpdateTasksMutation();
  const [reorderTasks] = useReorderTasksMutation();

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleFilterChange = useCallback((filters) => {
    setQueryParams((prev) => ({ ...prev, ...filters, page: 1 }));
    setSelectedIds([]);
  }, []);

  const handleRowClick = useCallback((task) => navigate(`/tasks/${task._id}`), [navigate]);

  const handleEdit = useCallback((task) => navigate(`/tasks/${task._id}`), [navigate]);

  const handleDelete = useCallback((task) => setDeleteTarget(task), []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget._id).unwrap();
      toast.success('Task deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete task');
    }
  }, [deleteTarget, deleteTask]);

  const handleReorder = useCallback(async (status, orderedIds) => {
    try { await reorderTasks({ status, orderedIds }).unwrap(); } catch {}
  }, [reorderTasks]);

  const handleStatusChange = useCallback(async (taskId, status) => {
    try {
      await updateTask({ id: taskId, status }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  }, [updateTask]);

  const handleAssign = useCallback(async (taskId, assignedTo) => {
    try {
      await updateTask({ id: taskId, assignedTo: assignedTo || null }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to assign');
    }
  }, [updateTask]);

  const handleCreateSubmit = useCallback(async (formData) => {
    try {
      await createTask(formData).unwrap();
      toast.success('Task created');
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create task');
    }
  }, [createTask]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    try {
      await bulkUpdate({ ids: selectedIds, status: bulkStatus }).unwrap();
      toast.success(`Updated ${selectedIds.length} tasks`);
      setSelectedIds([]);
      setBulkStatus('');
    } catch (err) {
      toast.error(err?.data?.message || 'Bulk update failed');
    }
  }, [bulkStatus, selectedIds, bulkUpdate]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Project', 'Due Date', 'Estimated Hours', 'Tags'];
    const rows = tasks.map((t) => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.status || '',
      t.priority || '',
      t.assignedTo?.name || '',
      t.project?.title || '',
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
      t.estimatedHours || 0,
      `"${(t.tags || []).join(', ')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tasks]);

  const statsConfig = [
    { key: 'total', label: 'Total', color: 'text-zinc-600' },
    { key: 'todo', label: 'To Do', color: 'text-zinc-500' },
    { key: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
    { key: 'review', label: 'Review', color: 'text-yellow-600' },
    { key: 'done', label: 'Done', color: 'text-green-600' },
    { key: 'overdue', label: 'Overdue', color: 'text-red-600', alert: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-primary-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-900">Tasks</h1>
            <p className="text-sm text-zinc-500">
              {stats.total > 0 ? `${stats.total} task${stats.total > 1 ? 's' : ''} total` : 'Manage your tasks'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              title="Table view"><LayoutList className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              title="Kanban view"><Columns className="w-4 h-4" /></button>
          </div>
          <button onClick={handleExportCSV}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            title="Export CSV"><Download className="w-4 h-4" /></button>
          {canCreate && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" /> New Task
            </Button>
          )}
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statsConfig.map(({ key, label, color, alert }) => (
            <div key={key} className={`bg-white rounded-xl border px-4 py-3 ${alert && stats[key] > 0 ? 'border-red-200 bg-red-50/30' : 'border-zinc-200'}`}>
              <p className={`text-2xl font-bold ${alert && stats[key] > 0 ? 'text-red-600' : 'text-primary-900'}`}>{stats[key] || 0}</p>
              <p className={`text-xs font-medium ${alert && stats[key] > 0 ? 'text-red-500' : color}`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <TaskFilters onFilterChange={handleFilterChange} users={users} projects={projects} />

      {selectedIds.length > 0 && (
        <div className="bg-primary-900/5 border border-primary-900/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-medium text-primary-900">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-auto py-1.5 text-xs w-32">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkAction} disabled={!bulkStatus}>Apply</Button>
            <button onClick={() => setSelectedIds([])} className="p-1 rounded text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <TaskKanbanBoard
            tasks={tasks}
            loading={isLoading}
            onTaskClick={handleRowClick}
            onStatusChange={handleStatusChange}
            onReorder={handleReorder}
          />
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="bg-white rounded-xl border border-zinc-200">
              <TableSkeleton rows={5} />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-12">
              <EmptyState icon={AlertTriangle} title="Failed to load tasks" description={error?.data?.message || 'Something went wrong.'} />
            </div>
          ) : (
            <TaskTable
              tasks={tasks}
              loading={false}
              canEdit={canEdit}
              canDelete={canDelete}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
              users={users}
            />
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={!pagination.hasPrevPage}
                onClick={() => setQueryParams((p) => ({ ...p, page: pagination.page - 1 }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">Previous</button>
              <span className="text-sm text-zinc-500">Page {pagination.page} of {pagination.pages}</span>
              <button disabled={!pagination.hasNextPage}
                onClick={() => setQueryParams((p) => ({ ...p, page: pagination.page + 1 }))}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">Next</button>
            </div>
          )}
        </>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Task" size="lg">
        <TaskForm
          users={users}
          projects={projects}
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          loading={isCreating}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Task?"
        message={deleteTarget ? `Delete task "${deleteTarget.title}"? This cannot be undone.` : ''}
      />
    </div>
  );
}
