import { useState, useEffect, useRef } from 'react';
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
import useSocketEntity from '../../../hooks/useSocketEntity';
import PortalChatPanel from '../components/PortalChatPanel';
import PortalDeliverablesCard from '../components/PortalDeliverablesCard';

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

import PortalMilestonesJourney from '../components/PortalMilestonesJourney';

export default function PortalProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('deliverables');
  const [expandedTask, setExpandedTask] = useState(null);

  const { data: projectData, isLoading, isError, error, refetch: refetchProject } = useGetProjectByIdQuery(id, { skip: !id });
  const project = projectData?.data?.project;
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useGetTasksQuery({ project: id, limit: 100 }, { skip: !id });

  const tasks = tasksData?.data || tasksData || [];
  const milestones = project?.milestones || [];
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);

  useSocketEntity('project', id, {
    onUpdate: (data) => {
      const action = data?.action;
      if (action === 'project_updated') {
        refetchProject();
      } else if (action === 'task_added' || action === 'task_updated' || action === 'task_deleted') {
        refetchTasks();
      } else if (action === 'comment_added' || action === 'comment_removed') {
        setTaskRefreshKey((k) => k + 1);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-6 w-40 bg-zinc-800" />
        <Skeleton className="h-32 w-full rounded-2xl bg-zinc-800" />
        <Skeleton className="h-64 w-full rounded-2xl bg-zinc-800" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <Link to="/portal/projects" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-amber-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </Link>
        <EmptyState title="Project not found" description={error?.data?.message || 'This project is unavailable.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Link to="/portal/projects" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </Link>
        <span className="text-xs px-3 py-1 rounded-full font-semibold border border-primary-200 bg-primary-50 text-primary-900 capitalize">
          {STATUS_LABELS[project.status] || project.status}
        </span>
      </div>

      {/* Project Hero Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-medium">PROJECT WORKSPACE</span>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">{project.name}</h1>
          </div>
          {project.projectCode && (
            <span className="self-start sm:self-auto font-mono text-xs px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold">
              {project.projectCode}
            </span>
          )}
        </div>
        {project.description && (
          <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">{project.description}</p>
        )}
        <div className="flex flex-wrap gap-5 mt-5 pt-4 border-t border-zinc-100 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-primary-900" /> Commenced {formatDate(project.startDate)}
          </span>
          {project.endDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-zinc-400" /> Target {formatDate(project.endDate)}
            </span>
          )}
          {project.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-zinc-400" /> {project.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-zinc-700">
            Brand: <span className="capitalize font-semibold text-primary-900">{project.brand || 'Rudhram'}</span>
          </span>
        </div>
      </div>

      {/* Visual Subway-Line Milestones Journey */}
      <PortalMilestonesJourney
        milestones={project.milestones || []}
        currentStatus={project.status}
        projectId={id}
      />

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
        {[
          {
            key: 'deliverables',
            label: `Deliverables & Assets (${(project.deliverables || []).length})`,
          },
          { key: 'overview', label: `Scope & Milestones (${milestones.length})` },
          { key: 'chat', label: 'Team Collaboration Chat' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-primary-900 text-white shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'deliverables' ? (
        <PortalDeliverablesCard project={project} />
      ) : activeTab === 'chat' ? (
        <div className="rounded-2xl border border-zinc-200/80 overflow-hidden h-[540px] bg-white shadow-xs">
          <PortalChatPanel projectId={id} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-900 font-heading mb-4">Milestone Deliveries</h2>
            {milestones.length === 0 ? (
              <EmptyState title="No milestones yet" description="Production milestones will sync as execution continues." />
            ) : (
              <ol className="relative border-l border-zinc-200 ml-3 space-y-6">
                {milestones.map((m) => (
                  <li key={m._id} className="relative pl-6">
                    <span
                      className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${MILESTONE_STATUS_COLORS[m.status] || 'bg-zinc-300'}`}
                    />
                    <p className="text-xs font-semibold text-zinc-800">{m.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {m.status === 'completed' ? 'Completed' : m.status === 'in_progress' ? 'In progress' : 'Pending'}
                      {m.dueDate && ` &bull; due ${formatDate(m.dueDate)}`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-900 font-heading mb-4">Tasks Breakdown ({tasks.length})</h2>
            {tasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full bg-zinc-200" />
                <Skeleton className="h-10 w-full bg-zinc-200" />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState title="No tasks visible" description="Detailed task schedules will populate once scheduled." />
            ) : (
              <div className="divide-y divide-zinc-100">
                {tasks.map((task) => (
                  <TaskRow key={task._id} task={task} expanded={expandedTask === task._id} onToggle={() => setExpandedTask(expandedTask === task._id ? null : task._id)} currentUser={user} refreshKey={taskRefreshKey} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, expanded, onToggle, currentUser, refreshKey }) {
  const { data: taskDetail, refetch: refetchTaskDetail } = useGetTaskByIdQuery(task._id, { skip: !expanded });
  const [commentText, setCommentText] = useState('');
  const [addComment, { isLoading: isAdding }] = useAddTaskCommentMutation();
  const [deleteComment] = useDeleteTaskCommentMutation();
  const prevRefreshKey = useRef(refreshKey);

  useEffect(() => {
    if (expanded && refreshKey !== prevRefreshKey.current) {
      refetchTaskDetail();
    }
    prevRefreshKey.current = refreshKey;
  }, [refreshKey, expanded, refetchTaskDetail]);

  const comments = taskDetail?.data?.task?.comments || task.comments || [];

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