import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { ArrowLeft, Edit2, Trash2, MessageSquare, Clock, User, Calendar, Eye, EyeOff, CheckSquare, Square, Plus, X, ListTodo, GitBranch, AtSign } from 'lucide-react';
import {
  useGetTaskByIdQuery, useUpdateTaskMutation, useDeleteTaskMutation, useAddTaskCommentMutation,
  useAddChecklistItemMutation, useUpdateChecklistItemMutation, useRemoveChecklistItemMutation,
  useWatchTaskMutation, useUnwatchTaskMutation,
  useAddTimeEntryMutation, useRemoveTimeEntryMutation,
} from '../../../services/taskApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { useGetProjectsQuery } from '../../../services/projectApi';
import TaskStatusBadge from '../components/TaskStatusBadge';
import TaskPriorityBadge from '../components/TaskPriorityBadge';
import TaskComment from '../components/TaskComment';
import TaskForm from '../components/TaskForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [timeForm, setTimeForm] = useState({ date: '', hours: '', description: '' });
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const commentInputRef = useRef(null);

  const { data: taskData, isLoading, error, refetch } = useGetTaskByIdQuery(id);
  const { data: usersData } = useGetUsersQuery({ limit: 200 }, { skip: !user });
  const { data: projectsData } = useGetProjectsQuery({ limit: 200 }, { skip: !user });
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddTaskCommentMutation();
  const [addChecklistItem] = useAddChecklistItemMutation();
  const [updateChecklistItem] = useUpdateChecklistItemMutation();
  const [removeChecklistItem] = useRemoveChecklistItemMutation();
  const [watchTask] = useWatchTaskMutation();
  const [unwatchTask] = useUnwatchTaskMutation();
  const [addTimeEntry] = useAddTimeEntryMutation();
  const [removeTimeEntry] = useRemoveTimeEntryMutation();

  const task = taskData?.data?.task || taskData?.task;
  const users = usersData?.data || [];
  const projects = projectsData?.data || [];

  useEffect(() => {
    if (task) dispatch(setPageTitle(task.title));
  }, [task, dispatch]);

  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);
  const isWatching = task?.watchers?.some((w) => (w._id || w) === user?._id);

  const handleEditSubmit = useCallback(async (formData) => {
    try {
      await updateTask({ id, ...formData }).unwrap();
      toast.success('Task updated');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update task');
    }
  }, [id, updateTask]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteTask(id).unwrap();
      toast.success('Task deleted');
      navigate('/tasks');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete task');
    }
  }, [id, deleteTask, navigate]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({ id, text: commentText.trim() }).unwrap();
      setCommentText('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add comment');
    }
  }, [id, commentText, addComment]);

  const handleToggleWatch = useCallback(async () => {
    try {
      if (isWatching) await unwatchTask(id).unwrap();
      else await watchTask(id).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to toggle watch');
    }
  }, [id, isWatching, watchTask, unwatchTask]);

  const handleAddChecklist = useCallback(async () => {
    if (!checklistText.trim()) return;
    try {
      await addChecklistItem({ id, text: checklistText.trim() }).unwrap();
      setChecklistText('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add checklist item');
    }
  }, [id, checklistText, addChecklistItem]);

  const handleToggleChecklist = useCallback(async (item) => {
    try {
      await updateChecklistItem({ id, itemId: item._id, checked: !item.checked }).unwrap();
    } catch (err) {
      toast.error('Failed to update checklist item');
    }
  }, [id, updateChecklistItem]);

  const handleRemoveChecklist = useCallback(async (itemId) => {
    try {
      await removeChecklistItem({ id, itemId }).unwrap();
    } catch (err) {
      toast.error('Failed to remove checklist item');
    }
  }, [id, removeChecklistItem]);

  const handleAddTime = useCallback(async () => {
    if (!timeForm.date || !timeForm.hours) return;
    try {
      await addTimeEntry({ id, date: new Date(timeForm.date).toISOString(), hours: Number(timeForm.hours), description: timeForm.description }).unwrap();
      setTimeForm({ date: '', hours: '', description: '' });
      toast.success('Time logged');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to log time');
    }
  }, [id, timeForm, addTimeEntry]);

  const handleRemoveTime = useCallback(async (entryId) => {
    try {
      await removeTimeEntry({ id, entryId }).unwrap();
    } catch (err) {
      toast.error('Failed to remove time entry');
    }
  }, [id, removeTimeEntry]);

  const mentionUsers = users.filter((u) => u._id !== user?._id);
  const filteredMentions = mentionQuery
    ? mentionUsers.filter((u) => u.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : mentionUsers;

  const handleCommentChange = useCallback((e) => {
    const val = e.target.value;
    setCommentText(val);

    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = val.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length > 0) {
        setMentionQuery(afterAt);
        setMentionOpen(true);
        setMentionIndex(0);
        return;
      }
    }
    setMentionOpen(false);
  }, []);

  const insertMention = useCallback((username) => {
    const lastAtIndex = commentText.lastIndexOf('@');
    const before = commentText.slice(0, lastAtIndex);
    const text = `${before}@${username} `;
    setCommentText(text);
    setMentionOpen(false);
    commentInputRef.current?.focus();
  }, [commentText]);

  const handleCommentKeyDown = useCallback((e) => {
    if (mentionOpen && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredMentions[mentionIndex]) {
          e.preventDefault();
          insertMention(filteredMentions[mentionIndex].name);
          return;
        }
      }
      if (e.key === 'Escape') { setMentionOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  }, [mentionOpen, filteredMentions, mentionIndex, insertMention, handleAddComment]);

  if (isLoading) return <div className="p-8 text-sm text-zinc-400">Loading...</div>;

  if (error || !task) {
    return (
      <div className="p-8">
        <EmptyState icon={ArrowLeft} title="Task not found"
          description={error?.data?.message || 'This task does not exist.'}
          action={<Button variant="secondary" onClick={() => navigate('/tasks')}>Back to Tasks</Button>} />
      </div>
    );
  }

  const doneChecklist = task.checklists?.filter((c) => c.checked).length || 0;
  const totalChecklist = task.checklists?.length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tasks')} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleWatch}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${isWatching ? 'bg-primary-50 text-primary-900' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'}`}>
            {isWatching ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isWatching ? 'Watching' : 'Watch'}
          </button>
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Task Info Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-primary-900">{task.title}</h1>
          {task.description && <p className="text-sm text-zinc-600 mt-2 whitespace-pre-wrap">{task.description}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Status</label>
            <div className="mt-1"><TaskStatusBadge status={task.status} /></div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Priority</label>
            <div className="mt-1"><TaskPriorityBadge priority={task.priority} /></div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Assignee</label>
            <p className="text-sm text-zinc-700 mt-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              {task.assignedTo?.name || 'Unassigned'}
            </p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Due Date</label>
            <p className="text-sm text-zinc-700 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          {task.project?.name && <span>Project: {task.project.name}</span>}
          {task.estimatedHours > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {task.estimatedHours}h estimated</span>}
          {task.totalLoggedHours > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {task.totalLoggedHours}h logged</span>}
          <span className="text-zinc-300">Created {formatDate(task.createdAt)} by {task.createdBy?.name || 'Unknown'}</span>
          <span className="text-zinc-300">{task.watchers?.length || 0} watching</span>
        </div>
        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <span key={tag} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Checklist Section */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4" /> Checklist {totalChecklist > 0 && `(${doneChecklist}/${totalChecklist})`}
        </h3>
        {totalChecklist > 0 && (
          <div className="h-1.5 bg-zinc-100 rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-primary-900 rounded-full transition-all" style={{ width: `${(doneChecklist / totalChecklist) * 100}%` }} />
          </div>
        )}
        <div className="space-y-1">
          {(task.checklists || []).map((item) => (
            <div key={item._id} className="flex items-center gap-2 py-1 group">
              <button onClick={() => handleToggleChecklist(item)} className="shrink-0">
                {item.checked ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4 text-zinc-300" />}
              </button>
              <span className={`flex-1 text-sm ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>{item.text}</span>
              {canEdit && (
                <button onClick={() => handleRemoveChecklist(item._id)} className="p-0.5 rounded text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="flex gap-2 mt-3">
            <input type="text" value={checklistText} onChange={(e) => setChecklistText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
              placeholder="Add checklist item..." className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
            <Button size="sm" onClick={handleAddChecklist} disabled={!checklistText.trim()}>Add</Button>
          </div>
        )}
      </div>

      {/* Subtasks Section */}
      {task.subtasks?.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center gap-2">
            <ListTodo className="w-4 h-4" /> Subtasks ({task.subtasks.length})
          </h3>
          <div className="space-y-1">
            {task.subtasks.map((sub) => (
              <div key={sub._id} className="flex items-center gap-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                <button onClick={() => navigate(`/tasks/${sub._id}`)} className="text-sm text-primary-900 hover:underline truncate">{sub.title}</button>
                {sub.status && <TaskStatusBadge status={sub.status} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies Section */}
      {(task.dependsOn?.length > 0 || task.blockedBy?.length > 0) && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Dependencies
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {task.dependsOn?.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 uppercase mb-2">Depends on</p>
                <div className="space-y-1">
                  {task.dependsOn.map((dep) => (
                    <div key={dep._id} className="flex items-center gap-2 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dep.status === 'done' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <button onClick={() => navigate(`/tasks/${dep._id}`)} className="text-sm text-primary-900 hover:underline truncate">{dep.title}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {task.blockedBy?.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 uppercase mb-2">Blocks</p>
                <div className="space-y-1">
                  {task.blockedBy.map((block) => (
                    <div key={block._id} className="flex items-center gap-2 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${block.status === 'done' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <button onClick={() => navigate(`/tasks/${block._id}`)} className="text-sm text-primary-900 hover:underline truncate">{block.title}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Tracking Section */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Time Logged ({task.totalLoggedHours || 0}h total)
        </h3>
        {canEdit && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <input type="date" value={timeForm.date} onChange={(e) => setTimeForm((p) => ({ ...p, date: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 w-40" />
            <input type="number" step="0.5" min="0.25" max="24" placeholder="Hours" value={timeForm.hours}
              onChange={(e) => setTimeForm((p) => ({ ...p, hours: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 w-24" />
            <input type="text" placeholder="Description" value={timeForm.description}
              onChange={(e) => setTimeForm((p) => ({ ...p, description: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 flex-1 min-w-[150px]" />
            <Button size="sm" onClick={handleAddTime} disabled={!timeForm.date || !timeForm.hours}>Log</Button>
          </div>
        )}
        {(!task.timeEntries || task.timeEntries.length === 0) ? (
          <p className="text-sm text-zinc-400 text-center py-4">No time entries</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {[...task.timeEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => (
              <div key={entry._id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-20">{formatDate(entry.date)}</span>
                  <span className="text-sm font-medium text-zinc-700">{entry.hours}h</span>
                  {entry.description && <span className="text-sm text-zinc-500">{entry.description}</span>}
                </div>
                {canEdit && (
                  <button onClick={() => handleRemoveTime(entry._id)} className="p-1 rounded text-zinc-300 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-primary-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Comments ({task.comments?.length || 0})
        </h3>
        {canEdit && (
          <div className="flex gap-2 mb-4 relative">
            <div className="flex-1 relative">
              <input ref={commentInputRef} type="text" value={commentText} onChange={handleCommentChange}
                onKeyDown={handleCommentKeyDown}
                placeholder="Type @ to mention someone..." className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
              {mentionOpen && filteredMentions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                  {filteredMentions.slice(0, 8).map((u, i) => (
                    <button key={u._id} onClick={() => insertMention(u.name)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-zinc-50 ${i === mentionIndex ? 'bg-zinc-50 text-primary-900' : 'text-zinc-700'}`}>
                      <AtSign className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="font-medium">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" onClick={handleAddComment} loading={isAddingComment} disabled={!commentText.trim()}>Send</Button>
          </div>
        )}
        {(!task.comments || task.comments.length === 0) ? (
          <p className="text-sm text-zinc-400 text-center py-4">No comments yet</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {[...task.comments].reverse().map((comment) => (
              <TaskComment key={comment._id} comment={comment} currentUserId={user?._id} />
            ))}
          </div>
        )}
      </div>

      {/* Activity Log */}
      {task.activities?.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-semibold text-primary-900 mb-3">Activity</h3>
          <div className="space-y-2">
            {[...task.activities].reverse().map((act) => (
              <div key={act._id} className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="text-xs text-zinc-300">{formatDate(act.createdAt)}</span>
                <span className="capitalize">{act.action?.replace(/_/g, ' ')}</span>
                {act.oldValue && <span className="text-zinc-400">from {act.oldValue}</span>}
                {act.newValue && <span className="text-zinc-600 font-medium">to {act.newValue}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Task" size="lg">
        <TaskForm initialData={task} users={users} projects={projects} onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)} loading={isUpdating} />
      </Modal>

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Delete Task?" message={`Delete "${task.title}"? This cannot be undone.`} />
    </div>
  );
}
