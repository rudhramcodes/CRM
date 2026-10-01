import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  X,
  Trash2,
  Clock,
  CheckSquare,
  Plus,
  MessageSquare,
  Send,
  Flag,
  User,
  FolderKanban,
  CheckCircle2,
  Circle,
  Timer,
  Play,
  Square,
  Calendar,
  Tag,
  AlertCircle,
  Sparkles,
  GitBranch,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Link2,
  Unlink,
  ExternalLink,
  History,
  Repeat,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import {
  useGetTaskByIdQuery,
  useGetTasksQuery,
  useGetSubtasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useRemoveChecklistItemMutation,
  useAddTaskCommentMutation,
  useDeleteTaskCommentMutation,
  useAddTimeEntryMutation,
  useRemoveTimeEntryMutation,
  useAddDependencyMutation,
  useRemoveDependencyMutation,
  useWatchTaskMutation,
  useUnwatchTaskMutation,
} from '../../../services/taskApi';
import { useGetUsersQuery } from '../../../services/userApi';
import useSocketEntity from '../../../hooks/useSocketEntity';
import { formatDate } from '../../../utils/formatters';
import { format, addDays, startOfToday } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

export default function TaskDrawer({ taskId, open, onClose, onSelectTask }) {
  const currentUser = useSelector((state) => state.auth.user);

  const {
    data: taskData,
    isLoading,
    refetch: refetchTask,
  } = useGetTaskByIdQuery(taskId, { skip: !taskId || !open });

  const { data: usersData } = useGetUsersQuery({ limit: 100 }, { skip: !open });
  const { data: allTasksData } = useGetTasksQuery({ limit: 100 }, { skip: !open });
  const {
    data: subtasksData,
    refetch: refetchSubtasks,
  } = useGetSubtasksQuery(taskId, { skip: !taskId || !open });

  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [addChecklistItem] = useAddChecklistItemMutation();
  const [updateChecklistItem] = useUpdateChecklistItemMutation();
  const [removeChecklistItem] = useRemoveChecklistItemMutation();
  const [addTaskComment] = useAddTaskCommentMutation();
  const [deleteTaskComment] = useDeleteTaskCommentMutation();
  const [addTimeEntry] = useAddTimeEntryMutation();
  const [removeTimeEntry] = useRemoveTimeEntryMutation();
  const [addDependency] = useAddDependencyMutation();
  const [removeDependency] = useRemoveDependencyMutation();
  const [watchTask] = useWatchTaskMutation();
  const [unwatchTask] = useUnwatchTaskMutation();

  // Real-time live sync for the active task
  useSocketEntity('task', taskId, {
    onUpdate: () => {
      refetchTask();
      refetchSubtasks();
    },
  });

  const task = taskData?.data?.task || taskData?.data;
  const users = usersData?.data?.users || (Array.isArray(usersData?.data) ? usersData.data : []) || [];
  const allTasks = allTasksData?.data?.tasks || (Array.isArray(allTasksData?.data) ? allTasksData.data : []) || [];
  const subtasks =
    subtasksData?.data?.tasks ||
    subtasksData?.data?.subtasks ||
    (Array.isArray(subtasksData?.data) ? subtasksData.data : []) ||
    [];

  // Drawer Tabs: 'overview' | 'time' | 'activity'
  const [activeTab, setActiveTab] = useState('overview');

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [selectedDepId, setSelectedDepId] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  // Manual Time Entry form
  const [manualHours, setManualHours] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Live Stopwatch State
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isStopwatchRunning) {
      timerRef.current = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStopwatchRunning]);

  useEffect(() => {
    if (task) {
      setTitleValue(task.title || '');
      setDescValue(task.description || '');
    }
  }, [task]);

  if (!open) return null;

  const isWatching = (task?.watchers || []).some(
    (w) => String(w._id || w) === String(currentUser?._id)
  );

  const handleToggleWatch = async () => {
    try {
      if (isWatching) {
        await unwatchTask(task._id).unwrap();
        toast.success('Unwatched task updates');
      } else {
        await watchTask(task._id).unwrap();
        toast.success('Watching task updates');
      }
    } catch (err) {
      toast.error('Failed to update watcher status');
    }
  };

  const isCreator = Boolean(
    currentUser?._id &&
    task?.createdBy &&
    (String(task.createdBy._id || task.createdBy) === String(currentUser._id))
  );

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'done' && !isCreator) {
      toast.error(`Only the task creator (${task?.createdBy?.name || 'creator'}) can review and mark this task as completed.`);
      return;
    }
    try {
      await updateTask({ id: task._id, status: newStatus }).unwrap();
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      await updateTask({ id: task._id, priority: newPriority }).unwrap();
      toast.success(`Priority updated to ${newPriority}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update priority');
    }
  };

  const handleAssigneeChange = async (userId) => {
    try {
      await updateTask({ id: task._id, assignedTo: userId === 'none' ? null : userId }).unwrap();
      toast.success('Assignee updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reassign task');
    }
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateTask({ id: task._id, title: titleValue.trim() }).unwrap();
      if (task.status === 'done') {
        toast.info('Task reopened to In Progress due to changes');
      } else {
        toast.success('Title updated');
      }
      setIsEditingTitle(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update title');
    }
  };

  const handleSaveDesc = async () => {
    try {
      await updateTask({ id: task._id, description: descValue }).unwrap();
      if (task.status === 'done') {
        toast.info('Task reopened to In Progress due to changes');
      } else {
        toast.success('Description updated');
      }
      setIsEditingDesc(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update description');
    }
  };

  const handleUpdateDueDate = async (dateStr) => {
    try {
      await updateTask({ id: task._id, dueDate: dateStr || null }).unwrap();
      if (task.status === 'done') {
        toast.info('Task reopened to In Progress due to changes');
      } else {
        toast.success(dateStr ? 'Due date updated' : 'Due date cleared');
      }
      setIsEditingDueDate(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update due date');
    }
  };

  // Subtasks logic
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      await createTask({
        title: newSubtaskTitle.trim(),
        parent: task._id,
        project: task.project?._id || task.project,
        status: 'todo',
      }).unwrap();
      setNewSubtaskTitle('');
      refetchSubtasks();
      if (['done', 'review'].includes(task.status)) {
        toast.info('Task returned to In Progress for new subtask work');
      } else {
        toast.success('Subtask created');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create subtask');
    }
  };

  const handleToggleSubtask = async (subtaskItem) => {
    const nextStatus = subtaskItem.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask({ id: subtaskItem._id, status: nextStatus }).unwrap();
      refetchSubtasks();
    } catch (err) {
      toast.error('Failed to update subtask status');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await deleteTask(subtaskId).unwrap();
      refetchSubtasks();
      toast.success('Subtask removed');
    } catch (err) {
      toast.error('Failed to remove subtask');
    }
  };

  // Dependencies logic
  const handleAddDependency = async () => {
    if (!selectedDepId) return;
    try {
      await addDependency({
        id: task._id,
        dependsOn: [selectedDepId],
      }).unwrap();
      setSelectedDepId('');
      toast.success('Dependency added');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to link dependency');
    }
  };

  const handleRemoveDependency = async (depId) => {
    try {
      await removeDependency({
        id: task._id,
        depId,
      }).unwrap();
      toast.success('Dependency unlinked');
    } catch (err) {
      toast.error('Failed to unlink dependency');
    }
  };

  // Checklists logic
  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    try {
      await addChecklistItem({ id: task._id, text: newChecklistText.trim() }).unwrap();
      setNewChecklistText('');
      if (['done', 'review'].includes(task.status)) {
        toast.info('Task returned to In Progress due to checklist changes');
      } else {
        toast.success('Checklist item added');
      }
    } catch (err) {
      toast.error('Failed to add checklist item');
    }
  };

  const handleToggleChecklist = async (item) => {
    try {
      const willBeChecked = !item.checked;
      await updateChecklistItem({
        id: task._id,
        itemId: item._id,
        checked: willBeChecked,
      }).unwrap();

      if (!willBeChecked && ['done', 'review'].includes(task.status)) {
        toast.info('Item unchecked — task reopened to In Progress');
      }

      const remainingUnchecked = task.checklists?.filter(
        (c) => c._id !== item._id && !c.checked
      ).length;

      if (willBeChecked && remainingUnchecked === 0 && task.status !== 'done') {
        if (isCreator) {
          toast((t) => (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-900">
                All checklist items done! Complete task?
              </span>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  await updateTask({ id: task._id, status: 'done' });
                  toast.success('Task marked as Done!');
                }}
                className="px-2.5 py-1 text-xs font-bold bg-primary-900 text-white rounded-lg cursor-pointer"
              >
                Mark Done
              </button>
            </div>
          ), { duration: 6000 });
        } else {
          toast((t) => (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-900">
                All items done! Submit for creator review?
              </span>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  await updateTask({ id: task._id, status: 'review' });
                  toast.success(`Submitted for review to ${task.createdBy?.name || 'creator'}!`);
                }}
                className="px-2.5 py-1 text-xs font-bold bg-amber-600 text-white rounded-lg cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          ), { duration: 6000 });
        }
      }
    } catch (err) {
      toast.error('Failed to update checklist');
    }
  };

  const handleRemoveChecklist = async (itemId) => {
    try {
      await removeChecklistItem({ id: task._id, itemId }).unwrap();
    } catch (err) {
      toast.error('Failed to remove checklist item');
    }
  };

  // Comments
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      await addTaskComment({ id: task._id, text: newCommentText.trim() }).unwrap();
      setNewCommentText('');
      toast.success('Comment posted');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteTaskComment({ id: task._id, commentId }).unwrap();
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  // Time logging
  const handleLogQuickHours = async (hours) => {
    try {
      await addTimeEntry({
        id: task._id,
        hours,
        date: new Date().toISOString(),
        description: `Logged ${hours}h via quick tracker`,
      }).unwrap();
      toast.success(`Logged ${hours}h`);
    } catch (err) {
      toast.error('Failed to log time');
    }
  };

  const handleLogStopwatchHours = async () => {
    if (stopwatchSeconds < 60) {
      toast.error('At least 1 minute must be tracked to log');
      return;
    }
    const hours = Math.round((stopwatchSeconds / 3600) * 100) / 100;
    try {
      await addTimeEntry({
        id: task._id,
        hours: Math.max(0.25, hours),
        date: new Date().toISOString(),
        description: `Stopwatch session (${Math.floor(stopwatchSeconds / 60)} mins)`,
      }).unwrap();
      toast.success(`Logged ${hours}h from stopwatch`);
      setIsStopwatchRunning(false);
      setStopwatchSeconds(0);
    } catch (err) {
      toast.error('Failed to save tracked time');
    }
  };

  const handleManualTimeSubmit = async (e) => {
    e.preventDefault();
    const hrs = Number(manualHours);
    if (!hrs || hrs <= 0) {
      toast.error('Please enter valid hours');
      return;
    }
    try {
      await addTimeEntry({
        id: task._id,
        hours: hrs,
        date: new Date().toISOString(),
        description: manualDesc.trim() || 'Manual time entry',
      }).unwrap();
      setManualHours('');
      setManualDesc('');
      toast.success(`Logged ${hrs} hours`);
    } catch (err) {
      toast.error('Failed to record time entry');
    }
  };

  const handleRemoveEntry = async (entryId) => {
    try {
      await removeTimeEntry({ id: task._id, entryId }).unwrap();
      toast.success('Time entry removed');
    } catch (err) {
      toast.error('Failed to remove entry');
    }
  };

  // Tags
  const handleAddTag = async (e) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;
    const existing = task.tags || [];
    if (existing.includes(tag)) {
      setNewTagInput('');
      return;
    }
    try {
      await updateTask({ id: task._id, tags: [...existing, tag] }).unwrap();
      setNewTagInput('');
      toast.success(`Tag #${tag} added`);
    } catch (err) {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    try {
      const updated = (task.tags || []).filter((t) => t !== tagToRemove);
      await updateTask({ id: task._id, tags: updated }).unwrap();
    } catch (err) {
      toast.error('Failed to remove tag');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(task._id).unwrap();
      toast.success('Task deleted');
      onClose();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const checklistTotal = task?.checklists?.length || 0;
  const checklistDone = task?.checklists?.filter((c) => c.checked)?.length || 0;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const subtasksTotal = subtasks.length;
  const subtasksDone = subtasks.filter((s) => s.status === 'done').length;
  const subtasksPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const timeEntries = task?.timeEntries || [];
  const activities = task?.activities || [];

  // Incomplete predecessors blocking this task
  const incompleteDeps = (task?.dependsOn || []).filter((d) => d && d.status !== 'done');
  const isBlocked = incompleteDeps.length > 0;

  // Candidate tasks to add as dependency
  const candidateDeps = allTasks.filter(
    (t) =>
      t._id !== task?._id &&
      !(task?.dependsOn || []).some((d) => (d._id || d) === t._id) &&
      t.parent !== task?._id
  );

  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

  const formatStopwatch = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Drawer open={open} onClose={onClose} size="xl">
      {isLoading || !task ? (
        <div className="p-8 text-center text-xs text-zinc-400">Loading task details...</div>
      ) : (
        <div className="flex flex-col space-y-5 pb-6">
          {/* Header Controls & Watcher */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-100 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Picker */}
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-auto gap-1 text-xs font-semibold rounded-xl bg-zinc-50 border-zinc-200">
                  <TaskStatusBadge status={task.status} />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                  {TASK_STATUS.map((s) => {
                    const isDoneOption = s.value === 'done';
                    const isOptionDisabled = isDoneOption && !isCreator;
                    return (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        disabled={isOptionDisabled}
                        className={cn(isOptionDisabled && 'opacity-50 cursor-not-allowed')}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{s.label}</span>
                          {isOptionDisabled && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              (Creator only)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Priority Picker */}
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-8 w-auto gap-1 text-xs font-semibold rounded-xl bg-zinc-50 border-zinc-200">
                  <TaskPriorityBadge priority={task.priority} />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                  {TASK_PRIORITY.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {task.project && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-xl">
                  <FolderKanban className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{task.project.title}</span>
                </span>
              )}

              {/* Blocked Pill Warning */}
              {isBlocked && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl animate-pulse">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Blocked</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Watch / Unwatch Button */}
              <button
                type="button"
                onClick={handleToggleWatch}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs',
                  isWatching
                    ? 'bg-primary-900 text-white border-primary-900'
                    : 'bg-white text-zinc-600 hover:text-primary-900 border-zinc-200 hover:bg-zinc-50'
                )}
                title={isWatching ? 'Stop receiving notifications' : 'Watch this task'}
              >
                {isWatching ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{isWatching ? 'Watching' : 'Watch'}</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Creator Review & Approval Gate Banner */}
          {task.status === 'review' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-950 block">
                    {isCreator ? 'Task Ready for Your Review' : 'Under Creator Review'}
                  </span>
                  <span className="text-[11px] text-amber-800 block">
                    {isCreator
                      ? 'You created this task. Approve to mark completed, or request changes to put it back in progress.'
                      : `Waiting for creator (${task.createdBy?.name || 'Task Creator'}) to review and approve.`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-semibold transition-colors cursor-pointer text-xs"
                >
                  Request Changes
                </button>
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('done')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer text-xs shadow-2xs"
                  >
                    Approve & Complete
                  </button>
                )}
              </div>
            </div>
          )}

          {task.status === 'done' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 block">
                    Task Completed & Approved
                  </span>
                  <span className="text-[11px] text-emerald-800 block">
                    Approved by {task.createdBy?.name || 'Task Creator'}. Any modifications will put it back in progress.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleStatusChange('in_progress')}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 font-semibold transition-colors cursor-pointer text-xs shrink-0"
              >
                Put Back in Progress
              </button>
            </div>
          )}

          {/* Parent Task Indicator Banner */}
          {task.parent && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-primary-900/10 text-primary-900 flex items-center justify-center shrink-0">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Subtask of Parent
                  </span>
                  <span className="font-bold text-primary-900 truncate block">
                    {task.parent.title || 'Parent Task'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectTask?.(task.parent._id || task.parent)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-primary-900 font-semibold text-xs hover:bg-zinc-100 hover:border-zinc-300 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                title="Navigate to parent task"
              >
                <span>Open Parent</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </button>
            </div>
          )}

          {/* Task Title */}
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full text-lg sm:text-xl font-bold text-primary-900 border-b border-primary-900 focus:outline-none bg-transparent"
                />
              </div>
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-lg sm:text-xl font-bold text-primary-900 tracking-tight hover:bg-zinc-50 p-1 -ml-1 rounded-lg cursor-pointer transition-colors"
                title="Click to edit title"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/80 self-start text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                activeTab === 'overview'
                  ? 'bg-white text-primary-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('time')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                activeTab === 'time'
                  ? 'bg-white text-primary-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Time & Effort ({task.actualHours || 0}h)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                activeTab === 'activity'
                  ? 'bg-white text-primary-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity History ({activities.length})</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Blocked Alert Banner if dependencies are not done */}
              {isBlocked && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Execution Paused • Dependent Tasks Incomplete</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Cannot move to <strong>In Progress</strong> or <strong>Done</strong> until the following predecessor{incompleteDeps.length > 1 ? 's are' : ' is'} closed:
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {incompleteDeps.map((dep) => (
                        <button
                          key={dep._id}
                          type="button"
                          onClick={() => onSelectTask?.(dep._id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold hover:border-amber-400 cursor-pointer shadow-2xs"
                        >
                          <span>{dep.title}</span>
                          <ExternalLink className="w-3 h-3 text-amber-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Meta Grid: Assignee, Due Date, Recurring */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70 text-xs">
                {/* Assignee */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Assignee
                  </p>
                  <Select
                    value={task.assignedTo?._id || 'none'}
                    onValueChange={handleAssigneeChange}
                  >
                    <SelectTrigger className="h-7 w-full border-0 bg-transparent p-0 shadow-none text-xs font-semibold text-zinc-800">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{task.assignedTo?.name || 'Unassigned'}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u._id} value={u._id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date & Quick Presets */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Due Date
                  </p>
                  {isEditingDueDate ? (
                    <div className="space-y-1.5">
                      <input
                        type="date"
                        defaultValue={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleUpdateDueDate(e.target.value)}
                        className="text-xs p-1 rounded-lg border border-zinc-300 bg-white"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateDueDate(todayStr)}
                          className="px-1.5 py-0.5 text-[10px] bg-white border border-zinc-200 rounded"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateDueDate(tomorrowStr)}
                          className="px-1.5 py-0.5 text-[10px] bg-white border border-zinc-200 rounded"
                        >
                          Tmrw
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateDueDate('')}
                          className="px-1.5 py-0.5 text-[10px] text-rose-600 bg-white border border-zinc-200 rounded"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsEditingDueDate(true)}
                      className="flex items-center gap-1.5 font-semibold text-zinc-800 hover:text-primary-900 cursor-pointer"
                      title="Click to edit deadline"
                    >
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{task.dueDate ? formatDate(task.dueDate) : 'Set deadline'}</span>
                    </div>
                  )}
                </div>

                {/* Recurring Status */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Automation Cadence
                  </p>
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                    <Repeat className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>
                      {task.recurring?.enabled
                        ? `Repeats ${task.recurring.frequency}`
                        : 'One-off deliverable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Description
                </label>
                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      rows={4}
                      className="w-full text-xs sm:text-sm p-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-900 bg-white"
                      placeholder="Add details, background context, or instructions..."
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingDesc(false)}
                        className="px-3 py-1.5 text-xs text-zinc-600 rounded-xl hover:bg-zinc-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDesc}
                        className="px-3 py-1.5 text-xs font-semibold bg-primary-900 text-white rounded-xl shadow-xs cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="p-3 rounded-xl border border-zinc-200/70 hover:border-zinc-300 min-h-[60px] text-xs sm:text-sm text-zinc-700 whitespace-pre-wrap cursor-pointer transition-colors bg-zinc-50/40"
                    title="Click to edit description"
                  >
                    {task.description || (
                      <span className="text-zinc-400 italic">No description provided. Click to add.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Subtasks Hierarchy Section */}
              <div className="space-y-3 p-4 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Subtasks Hierarchy
                    </span>
                    {subtasksTotal > 0 && (
                      <span className="text-xs font-semibold text-zinc-400">
                        ({subtasksDone}/{subtasksTotal})
                      </span>
                    )}
                  </div>

                  {subtasksTotal > 0 && (
                    <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-900 rounded-full transition-all"
                        style={{ width: `${subtasksPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Subtasks List */}
                <div className="space-y-2">
                  {subtasks.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-1 italic">
                      No subtasks broken down yet.
                    </p>
                  ) : (
                    subtasks.map((sub) => {
                      const isDone = sub.status === 'done';
                      return (
                        <div
                          key={sub._id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(sub)}
                              className="p-0.5 text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                              ) : (
                                <Circle className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                              )}
                            </button>
                            <span
                              onClick={() => onSelectTask?.(sub._id)}
                              className={cn(
                                'text-xs truncate cursor-pointer hover:underline',
                                isDone ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium'
                              )}
                              title="Open subtask details"
                            >
                              {sub.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {sub.assignedTo && (
                              <div
                                className="w-4 h-4 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-[8px]"
                                title={sub.assignedTo.name}
                              >
                                {(sub.assignedTo.name?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(sub._id)}
                              className="p-1 text-zinc-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete subtask"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Subtask Input Form */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="+ Add broken down subtask (press Enter)..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-zinc-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-900"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim()}
                    className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Add Subtask
                  </button>
                </form>
              </div>

              {/* Dependencies & Blocking Section */}
              <div className="space-y-3 p-4 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Dependencies & Blocking
                    </span>
                  </div>
                </div>

                {/* Predecessors */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Waiting on (Must finish before this task)
                  </p>
                  {(task.dependsOn || []).length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-1">
                      No predecessor dependencies. Task can start freely.
                    </p>
                  ) : (
                    task.dependsOn.map((dep) => (
                      <div
                        key={dep._id || dep}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-200/60"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {dep.status === 'done' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span
                            onClick={() => onSelectTask?.(dep._id)}
                            className="text-xs font-medium text-zinc-800 truncate cursor-pointer hover:underline"
                          >
                            {dep.title || 'Task'}
                          </span>
                          <TaskStatusBadge status={dep.status || 'todo'} />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(dep._id || dep)}
                          className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                          title="Unlink dependency"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Dependency Picker */}
                {candidateDeps.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                    <Select value={selectedDepId} onValueChange={setSelectedDepId}>
                      <SelectTrigger className="flex-1 h-9 text-xs font-medium rounded-xl bg-zinc-50 border-zinc-200">
                        <SelectValue placeholder="Select a task that must finish first..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                        {candidateDeps.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.title} ({t.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={handleAddDependency}
                      disabled={!selectedDepId}
                      className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      Link
                    </button>
                  </div>
                )}
              </div>

              {/* Deliverable Checklists */}
              <div className="space-y-3 p-4 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Deliverable Checklist
                    </span>
                    {checklistTotal > 0 && (
                      <span className="text-xs font-semibold text-zinc-400">
                        ({checklistDone}/{checklistTotal})
                      </span>
                    )}
                  </div>

                  {checklistTotal > 0 && (
                    <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${checklistPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Checklist Items List */}
                <div className="space-y-1.5">
                  {(task.checklists || []).map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-zinc-50 transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleChecklist(item)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        {item.checked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-300 hover:text-zinc-500 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-xs truncate',
                            item.checked ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium',
                          )}
                        >
                          {item.text}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveChecklist(item._id)}
                        className="p-1 text-zinc-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Checklist Item Input */}
                <form onSubmit={handleAddChecklist} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add checklist bullet item..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-zinc-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-900"
                  />
                  <button
                    type="submit"
                    disabled={!newChecklistText.trim()}
                    className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Add Item
                  </button>
                </form>
              </div>

              {/* Tags & Labels */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Tags & Labels</span>
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(task.tags || []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200/70"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-zinc-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}

                  <form onSubmit={handleAddTag} className="inline-flex items-center">
                    <input
                      type="text"
                      placeholder="+ Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="text-xs px-2.5 py-1 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-900 w-24"
                    />
                  </form>
                </div>
              </div>

              {/* Comments & Discussion */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Discussion & Notes ({task.comments?.length || 0})
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {(task.comments || []).length === 0 ? (
                    <p className="text-xs text-zinc-400 py-3 text-center">
                      No comments yet. Start the conversation below.
                    </p>
                  ) : (
                    task.comments.map((c) => (
                      <div key={c._id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-zinc-900">{c.createdBy?.name || 'User'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">{formatDate(c.createdAt)}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c._id)}
                              className="text-zinc-300 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-700 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Box */}
                <form onSubmit={handleAddComment} className="flex items-center gap-2 pb-2">
                  <input
                    type="text"
                    placeholder="Write an internal comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-zinc-200/90 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-900 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="p-2 rounded-xl bg-primary-900 text-white hover:bg-primary-950 disabled:opacity-40 cursor-pointer shadow-2xs"
                    title="Post comment"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>  
            </div>
          )}

          {/* TAB 2: TIME & EFFORT TRACKING */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              {/* Summary Effort Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/70">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Total Logged
                  </span>
                  <p className="text-xl font-bold text-primary-900 mt-1">
                    {task.actualHours || 0} hrs
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Estimated
                  </span>
                  <p className="text-xl font-bold text-zinc-700 mt-1">
                    {task.estimatedHours || 0} hrs
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Sessions Logged
                  </span>
                  <p className="text-xl font-bold text-zinc-700 mt-1">
                    {timeEntries.length}
                  </p>
                </div>
              </div>

              {/* Live Stopwatch Panel */}
              <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-800">
                    <Timer className="w-4 h-4 text-zinc-500" />
                    <span>Real-Time Stopwatch</span>
                  </div>
                  <span className="font-mono text-base font-bold text-primary-900">
                    {formatStopwatch(stopwatchSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {!isStopwatchRunning ? (
                    <button
                      type="button"
                      onClick={() => setIsStopwatchRunning(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Stopwatch</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsStopwatchRunning(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Pause Stopwatch</span>
                    </button>
                  )}

                  {stopwatchSeconds > 0 && (
                    <button
                      type="button"
                      onClick={handleLogStopwatchHours}
                      className="px-3 py-1.5 rounded-xl bg-primary-900 hover:bg-primary-950 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Log Elapsed Session
                    </button>
                  )}
                </div>

                {/* Quick Add Presets */}
                <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-400 font-medium">Quick log:</span>
                  {[0.25, 0.5, 1, 2].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => handleLogQuickHours(hrs)}
                      className="px-2 py-1 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors cursor-pointer"
                    >
                      +{hrs >= 1 ? `${hrs}h` : `${hrs * 60}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Time Entry Box */}
              <form onSubmit={handleManualTimeSubmit} className="p-4 rounded-2xl border border-zinc-200/80 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                  Manual Entry
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    placeholder="Hours (e.g. 1.5)"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    className="text-xs px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-900"
                  />
                  <input
                    type="text"
                    placeholder="Work description / note..."
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="sm:col-span-2 text-xs px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualHours}
                  className="px-3.5 py-1.5 bg-primary-900 text-white rounded-xl text-xs font-semibold hover:bg-primary-950 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Record Hours
                </button>
              </form>

              {/* Detailed Time Entries History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                  Recorded Sessions ({timeEntries.length})
                </h4>
                {timeEntries.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-3 text-center">
                    No time entries logged on this deliverable yet.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white overflow-hidden">
                    {timeEntries.map((entry) => (
                      <div key={entry._id} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary-900">{entry.hours} hrs</span>
                            <span className="text-zinc-400">&bull;</span>
                            <span className="text-zinc-500">{formatDate(entry.date)}</span>
                          </div>
                          {entry.description && (
                            <p className="text-zinc-600 text-[11px] mt-0.5">{entry.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(entry._id)}
                          className="p-1 text-zinc-300 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove time entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT & ACTIVITY HISTORY */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                Timeline & Event Log ({activities.length})
              </h4>

              {activities.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  No activity logged yet. All edits and status updates will be audited here.
                </p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                  {activities.map((act) => (
                    <div key={act._id} className="relative text-xs space-y-1">
                      {/* Timeline Dot */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary-900 ring-4 ring-white" />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-primary-900">
                          {act.performedBy?.name || 'Team Member'}
                        </span>
                        <span className="text-zinc-400">{formatDate(act.createdAt)}</span>
                      </div>
                      <p className="text-zinc-600">
                        {act.action === 'status_changed' ? (
                          <span>
                            Changed status from <strong className="text-zinc-800">{act.oldValue}</strong> to <strong className="text-emerald-700">{act.newValue}</strong>
                          </span>
                        ) : act.action === 'assigned' ? (
                          <span>
                            Reassigned task to <strong className="text-primary-900">{act.newValue}</strong>
                          </span>
                        ) : (
                          <span>Updated {act.field || 'task details'}</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
