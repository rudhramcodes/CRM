import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  User,
  Tag,
  Clock,
  Send,
  AlertTriangle,
  FolderKanban,
  BarChart3,
  History,
  ArrowRight,
} from 'lucide-react';
import {
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddTaskCommentMutation,
} from '../../../services/taskApi';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetUsersQuery } from '../../../services/userApi';
import TaskStatusBadge from '../components/TaskStatusBadge';
import TaskPriorityBadge from '../../tasks/components/TaskPriorityBadge';
import TaskComment from '../components/TaskComment';
import TaskForm from '../components/TaskForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime, getTimeAgo } from '../../../utils/formatters';
import { renderMarkdown } from '../../../utils/markdown';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { data: taskData, isLoading, error } = useGetTaskByIdQuery(id);
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });
  const { data: usersData } = useGetUsersQuery({ limit: 100 });
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddTaskCommentMutation();

  const task = taskData?.data?.task;
  const projects = projectsData?.data || [];
  const users = usersData?.data?.users || [];

  useEffect(() => {
    if (task) dispatch(setPageTitle(task.title));
  }, [task, dispatch]);

  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = useCallback(async () => {
    try {
      await deleteTask(id).unwrap();
      toast.success('Task deleted');
      navigate('/tasks');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete task');
    }
  }, [id, deleteTask, navigate]);

  const handleEditSubmit = useCallback(async (formData) => {
    try {
      await updateTask({ id, ...formData }).unwrap();
      toast.success('Task updated');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update task');
    }
  }, [id, updateTask]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment({ id, text: commentText.trim() }).unwrap();
      toast.success('Comment added');
      setCommentText('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add comment');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader /></div>;
  }

  if (error || !task) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Task not found"
        description="The task you're looking for doesn't exist or has been removed."
        action={<Button variant="secondary" onClick={() => navigate('/tasks')}>Back to Tasks</Button>}
      />
    );
  }

  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tasks')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h1 className="text-xl font-bold text-primary-900">{task.title}</h1>
        {task.description && (
          <div className="mt-3 prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(task.description) }} />
        )}
        {task.tags?.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <Tag className="w-4 h-4 text-zinc-400" />
            <div className="flex gap-1.5 flex-wrap">
              {task.tags.map((tag) => (
                <span key={tag} className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Status</p>
          <TaskStatusBadge status={task.status} />
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Priority</p>
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Due Date</span>
          </div>
          <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-primary-900'}`}>
            {task.dueDate ? formatDate(task.dueDate) : <span className="text-zinc-300">&mdash;</span>}
            {isOverdue && <span className="ml-1.5 text-xs text-red-500 font-medium">(Overdue)</span>}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <User className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Assignee</span>
          </div>
          <p className="text-sm font-medium text-primary-900">
            {task.assignedTo?.name || <span className="text-zinc-300">&mdash;</span>}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Project</span>
          </div>
          <p className="text-sm font-medium text-primary-900">
            {task.project?.title || <span className="text-zinc-300">&mdash;</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Estimated</span>
          </div>
          <p className="text-sm font-medium text-primary-900">{task.estimatedHours || 0}h</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Actual</span>
          </div>
          <p className="text-sm font-medium text-primary-900">{task.actualHours || 0}h</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-primary-900">Comments ({task.comments?.length || 0})</h3>
        </div>
        <div className="px-6 py-4">
          {task.comments?.length > 0 ? (
            <div className="divide-y divide-zinc-50">
              {[...task.comments].reverse().map((comment) => (
                <TaskComment key={comment._id} comment={comment} currentUserId={user?._id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-4">No comments yet</p>
          )}
          <form onSubmit={handleAddComment} className="mt-4 flex items-start gap-2">
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..." rows={2}
              className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none" />
            <Button type="submit" size="sm" disabled={!commentText.trim()} loading={isAddingComment}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {task.activities?.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="px-6 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-primary-900">Activity Log</h3>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-3">
              {[...task.activities].reverse().map((act) => (
                <div key={act._id} className="flex items-start gap-2.5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500">
                      {act.performedBy?.name || 'Someone'}{' '}
                      changed <span className="font-medium text-zinc-600">{act.field}</span>
                      {act.oldValue && act.newValue ? (
                        <>
                          {' from '}<span className="text-zinc-400 line-through">{act.oldValue}</span>
                          {' to '}<span className="text-zinc-700 font-medium">{act.newValue}</span>
                        </>
                      ) : act.newValue ? (
                        <> to <span className="text-zinc-700 font-medium">{act.newValue}</span></>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{getTimeAgo(act.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-400 text-right">
        Created {formatDateTime(task.createdAt)} by {task.createdBy?.name || 'System'}
        {task.completedAt && <> · Completed {formatDateTime(task.completedAt)}</>}
      </div>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Task" size="lg">
            <TaskForm initialData={task} users={users} projects={projects} onSubmit={handleEditSubmit} onCancel={() => setShowEditModal(false)} loading={isUpdating} />
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
}
