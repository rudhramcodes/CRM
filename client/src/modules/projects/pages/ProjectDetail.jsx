import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Tag,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  useGetProjectByIdQuery,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
  useGetProjectActivitiesQuery,
  useAddProjectTaskMutation,
  useUpdateProjectTaskMutation,
  useDeleteProjectTaskMutation,
} from '../../../services/projectApi';
import ProjectStatusBadge from '../components/ProjectStatusBadge';
import ProjectPriorityBadge from '../components/ProjectPriorityBadge';
import ProjectForm from '../components/ProjectForm';
import ProjectMilestones from '../components/ProjectMilestones';
import ProjectTasks from '../components/ProjectTasks';
import ProjectActivityLog from '../components/ProjectActivityLog';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/formatters';

const formatCurrency = (amount, currency = 'INR') => {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const { data: projectData, isLoading, error } = useGetProjectByIdQuery(id);
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const { data: activitiesData, isLoading: activitiesLoading } = useGetProjectActivitiesQuery(id, { skip: !id });
  const [addTask] = useAddProjectTaskMutation();
  const [updateTask] = useUpdateProjectTaskMutation();
  const [deleteTask] = useDeleteProjectTaskMutation();

  const project = projectData?.data?.project;
  const activities = activitiesData?.data || [];

  useEffect(() => {
    if (project) {
      dispatch(setPageTitle(project.title));
    }
  }, [project, dispatch]);

  const canEditAll = user && ['super_admin', 'admin'].includes(user.role);
  const canManage = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = useCallback(async () => {
    try {
      await deleteProject(id).unwrap();
      toast.success('Project deleted successfully');
      navigate('/projects');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete project');
    }
  }, [id, deleteProject, navigate]);

  const handleMilestonesUpdate = useCallback(
    async (milestones) => {
      try {
        await updateProject({ id, milestones }).unwrap();
        toast.success('Milestones updated');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update milestones');
      }
    },
    [id, updateProject],
  );

  const handleAddTask = useCallback(async (data) => {
    try {
      await addTask({ id, ...data }).unwrap();
      toast.success('Task added');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add task');
    }
  }, [id, addTask]);

  const handleUpdateTask = useCallback(async (taskId, data) => {
    try {
      await updateTask({ id, taskId, ...data }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update task');
    }
  }, [id, updateTask]);

  const handleDeleteTask = useCallback((taskId) => setDeleteTaskId(taskId), []);

  const confirmDeleteTask = useCallback(async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTask({ id, taskId: deleteTaskId }).unwrap();
      toast.success('Task removed');
      setDeleteTaskId(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to remove task');
    }
  }, [deleteTaskId, id, deleteTask]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been removed."
        action={
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        }
      />
    );
  }

  const budgetFormatted = formatCurrency(project.budget, project.currency);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" onClick={handleDelete} loading={isDeleting}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-900">{project.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <ProjectStatusBadge status={project.status} />
              <ProjectPriorityBadge priority={project.priority} />
            </div>
          </div>
        </div>
        {project.description && (
          <p className="mt-4 text-sm text-zinc-600 leading-relaxed max-w-2xl">
            {project.description}
          </p>
        )}
        {project.tags?.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <Tag className="w-4 h-4 text-zinc-400" />
            <div className="flex gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Budget</span>
          </div>
          <p className="text-sm font-medium text-primary-900">
            {budgetFormatted || <span className="text-zinc-300">&mdash;</span>}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Timeline</span>
          </div>
          <p className="text-sm font-medium text-primary-900">
            {project.startDate ? formatDate(project.startDate) : '—'}
            {(project.startDate || project.deadline) && ' → '}
            {project.deadline ? formatDate(project.deadline) : '—'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
          </div>
          <p className="text-sm font-medium text-primary-900">
            {project.completedAt ? formatDate(project.completedAt) : <span className="text-zinc-300">&mdash;</span>}
          </p>
        </div>
      </div>

      {project.teamMembers?.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-primary-900">Team Members</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg text-sm"
              >
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-900">
                    {member.name?.charAt(0) || '?'}
                  </span>
                </div>
                <span className="text-zinc-700">{member.name || member.user?.name || 'Unknown'}</span>
                <span className="text-xs text-zinc-400 capitalize">{member.role || 'member'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProjectMilestones
        milestones={project.milestones || []}
        onUpdate={handleMilestonesUpdate}
        canManage={canManage}
      />

      <ProjectTasks
        tasks={project.tasks || []}
        canManage={canEditAll}
        onAdd={handleAddTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      <ProjectActivityLog activities={activities} loading={activitiesLoading} />

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Project">
        <ProjectForm
          project={project}
          onSuccess={() => setShowEditModal(false)}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Project?"
        message="Delete this project? This action cannot be undone."
      />

      <ConfirmDialog
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={confirmDeleteTask}
        title="Remove Task?"
        message="Remove this task?"
        confirmLabel="Remove"
      />
    </div>
  );
}
