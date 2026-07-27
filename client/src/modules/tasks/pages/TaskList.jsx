import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, CheckSquare, RefreshCw, Columns3, LayoutList } from 'lucide-react';
import { useGetTasksQuery, useGetTaskByIdQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation, useReorderTasksMutation } from '../../../services/taskApi';
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
import toast from 'react-hot-toast';

export default function TaskList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10 });
  const [view, setView] = useState('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { dispatch(setPageTitle('Tasks')); }, [dispatch]);

  const { data, isLoading, error, refetch, isFetching } = useGetTasksQuery(queryParams);
  const { data: boardData, isLoading: boardLoading } = useGetTasksQuery(
    { limit: 100 },
    { skip: view !== 'board' },
  );
  const { data: usersData } = useGetUsersQuery({ limit: 200 });
  const { data: projectsData } = useGetProjectsQuery({ limit: 200 });
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [reorderTasks] = useReorderTasksMutation();

  const tasks = data?.data || [];
  const boardTasks = boardData?.data || [];
  const pagination = data?.pagination;
  const users = usersData?.data || [];
  const projects = projectsData?.data || [];

  const canManage = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleFilterChange = useCallback((filters) => {
    setQueryParams((prev) => {
      const next = { ...prev, page: 1 };
      for (const [key, val] of Object.entries(filters)) {
        if (val) next[key] = val;
        else delete next[key];
      }
      return next;
    });
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

  const handleCreate = useCallback(async (formData) => {
    try {
      await createTask(formData).unwrap();
      toast.success('Task created');
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create task');
    }
  }, [createTask]);

  const handleStatusChange = useCallback(async (taskId, status) => {
    try {
      await updateTask({ id: taskId, status }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  }, [updateTask]);

  const handleReorder = useCallback(async ({ status, orderedIds }) => {
    try {
      await reorderTasks({ status, orderedIds }).unwrap();
    } catch (err) {}
  }, [reorderTasks]);

  const handlePageChange = useCallback((page) => setQueryParams((prev) => ({ ...prev, page })), []);
  const handlePageSizeChange = useCallback((limit) => setQueryParams((prev) => ({ ...prev, page: 1, limit })), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Tasks</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage and track your team's work</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
            <button onClick={() => setView('table')}
              className={`p-1.5 rounded-md text-sm transition-colors ${view === 'table' ? 'bg-white text-primary-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`} title="Table view">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setView('board')}
              className={`p-1.5 rounded-md text-sm transition-colors ${view === 'board' ? 'bg-white text-primary-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`} title="Board view">
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {canManage && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" /> New Task
            </Button>
          )}
        </div>
      </div>

      <TaskFilters onFilterChange={handleFilterChange} projects={projects} users={users} />

      {view === 'table' ? (
        isLoading ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center text-sm text-zinc-400">Loading...</div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-12">
            <EmptyState icon={CheckSquare} title="Failed to load tasks" description={error?.data?.message || 'Something went wrong'} />
          </div>
        ) : (
          <TaskTable
            tasks={tasks} loading={false} error={null} onRowClick={handleRowClick}
            canEdit={canManage} canDelete={canDelete} onEdit={handleEdit} onDelete={handleDelete}
            serverPagination page={pagination?.page || 1} pageSize={pagination?.limit || 10}
            total={pagination?.total} totalPages={pagination?.pages}
            hasNextPage={pagination?.hasNextPage} hasPrevPage={pagination?.hasPrevPage}
            onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange}
          />
        )
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <TaskKanbanBoard
            tasks={boardTasks}
            loading={boardLoading}
            onTaskClick={handleRowClick}
            onStatusChange={handleStatusChange}
            onReorder={handleReorder}
          />
        </div>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Task" size="lg">
        <TaskForm projects={projects} users={users} onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} loading={isCreating} />
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Delete Task?" message={deleteTarget ? `Delete "${deleteTarget.title}"? This cannot be undone.` : ''} />
    </div>
  );
}
