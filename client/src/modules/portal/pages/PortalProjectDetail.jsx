import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, ChevronDown, MapPin, CalendarDays, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import { getStatusColor, formatDate } from '../../../utils/formatters';
import { useGetProjectByIdQuery } from '../../../services/projectApi';
import { useGetTasksQuery, useGetTaskByIdQuery, useAddTaskCommentMutation, useDeleteTaskCommentMutation } from '../../../services/taskApi';
import PortalChatPanel from '../components/PortalChatPanel';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  review: 'Review',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

const TASK_STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const PRIORITY_COLORS = {
  low: 'text-zinc-500 bg-zinc-100',
  medium: 'text-amber-700 bg-amber-100',
  high: 'text-red-700 bg-red-100',
  urgent: 'text-red-800 bg-red-200',
};

const MILESTONE_STATUS_COLORS = {
  pending: 'bg-zinc-200',
  in_progress: 'bg-primary-900',
  completed: 'bg-green-500',
};

export default function PortalProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedTask, setExpandedTask] = useState(null);

  const { data: project, isLoading, isError, error } = useGetProjectByIdQuery(id, { skip: !id });
  const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery({ project: id, limit: 100 }, { skip: !id });

  const tasks = tasksData?.data || tasksData || [];
  const milestones = project?.milestones || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4">
        <Link to="/portal/projects" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </Link>
        <EmptyState title="Project not found" description={error?.data?.message || 'This project is unavailable.'} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/portal/projects" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </Link>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(project.status)}`}>
          {STATUS_LABELS[project.status] || project.status}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h1 className="font-heading text-xl font-semibold text-primary-900">{project.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">{project.description}</p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-zinc-400" /> Started {formatDate(project.startDate)}
          </span>
          {project.endDate && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-zinc-400" /> Ends {formatDate(project.endDate)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="text-zinc-400">Client:</span> {project.client?.companyName || '—'}
          </span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'chat', label: 'Chat' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-primary-900 text-primary-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden h-[480px]">
          <PortalChatPanel projectId={id} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-primary-900 mb-4">Milestones</h2>
            {milestones.length === 0 ? (
              <EmptyState title="No milestones yet" description="Our team will add milestones as the project progresses." />
            ) : (
              <ol className="relative border-l border-zinc-200 ml-3 space-y-6">
                {milestones.map((m) => (
                  <li key={m._id} className="relative pl-6">
                    <span
                      className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${MILESTONE_STATUS_COLORS[m.status] || 'bg-zinc-200'}`}
                    />
                    <p className="text-sm font-medium text-primary-900">{m.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {m.status === 'completed' ? 'Completed' : m.status === 'in_progress' ? 'In progress' : 'Pending'}
                      {m.dueDate && ` · due ${formatDate(m.dueDate)}`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-primary-900 mb-4">Tasks ({tasks.length})</h2>
            {tasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState title="No tasks yet" description="Tasks will appear here once our team starts working." />
            ) : (
              <div className="divide-y divide-zinc-100">
                {tasks.map((task) => (
                  <TaskRow key={task._id} task={task} expanded={expandedTask === task._id} onToggle={() => setExpandedTask(expandedTask === task._id ? null : task._id)} currentUser={user} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, expanded, onToggle, currentUser }) {
  const { data: taskDetail } = useGetTaskByIdQuery(task._id, { skip: !expanded });
  const [commentText, setCommentText] = useState('');
  const [addComment, { isLoading: isAdding }] = useAddTaskCommentMutation();
  const [deleteComment] = useDeleteTaskCommentMutation();

  const comments = taskDetail?.comments || task.comments || [];

  const handleAddComment = async (e) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || isAdding) return;
    try {
      await addComment({ id: task._id, text: trimmed }).unwrap();
      setCommentText('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment({ id: task._id, commentId }).unwrap();
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete comment');
    }
  };

  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center justify-between py-3 text-left hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-primary-900 truncate">{task.title}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] || 'text-zinc-500 bg-zinc-100'}`}>
              {task.priority}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {task.assignedTo?.name || 'Unassigned'}
            {task.dueDate && ` · due ${formatDate(task.dueDate)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
            {TASK_STATUS_LABELS[task.status] || task.status}
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="pb-3 pl-4">
          {task.description && <p className="text-sm text-zinc-600 mb-3">{task.description}</p>}

          <div className="space-y-1">
            {comments.length === 0 && <p className="text-xs text-zinc-400 mb-2">No comments yet.</p>}
            {comments.map((comment) => (
              <div key={comment._id} className="flex items-start gap-2 py-1.5 group">
                <div className="w-6 h-6 rounded-full bg-primary-900/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-medium text-primary-900">
                    {comment.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-800">{comment.createdBy?.name || 'Unknown'}</span>
                    <span className="text-[10px] text-zinc-400">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">{comment.text}</p>
                </div>
                {comment.createdBy?._id === currentUser?._id && (
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
            <Button type="submit" loading={isAdding} disabled={!commentText.trim() || isAdding} className="!p-2">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}