import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, FolderKanban } from 'lucide-react';
import {
  useGetProjectsQuery,
  useGetProjectStatsQuery,
  useDeleteProjectMutation,
} from '../../../services/projectApi';
import ProjectTable from '../components/ProjectTable';
import ProjectFilters from '../components/ProjectFilters';
import ProjectForm from '../components/ProjectForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function ProjectList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(setPageTitle('Projects'));
  }, [dispatch]);

  const { data, isLoading, error } = useGetProjectsQuery(queryParams);
  const { data: statsData, isLoading: statsLoading } = useGetProjectStatsQuery();
  const [deleteProject] = useDeleteProjectMutation();

  const projects = data?.data || [];
  const pagination = data?.pagination;
  const stats = statsData?.data || {};

  const handleFilterChange = useCallback((filters) => {
    setQueryParams((prev) => ({ ...prev, ...filters, page: 1 }));
  }, []);

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleRowClick = useCallback(
    (project) => navigate(`/projects/${project._id}`),
    [navigate],
  );

  const handleEdit = useCallback(
    (project) => navigate(`/projects/${project._id}`),
    [navigate],
  );

  const handleDelete = useCallback(
    async (project) => {
      if (!window.confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
      try {
        await deleteProject(project._id).unwrap();
        toast.success('Project deleted successfully');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete project');
      }
    },
    [deleteProject],
  );

  const statsConfig = [
    { key: 'total', label: 'Total', color: 'text-zinc-600' },
    { key: 'planning', label: 'Planning', color: 'text-purple-600' },
    { key: 'active', label: 'Active', color: 'text-green-700' },
    { key: 'review', label: 'Review', color: 'text-yellow-600' },
    { key: 'completed', label: 'Completed', color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-primary-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-900">Projects</h1>
            <p className="text-sm text-zinc-500">
              {stats.total > 0 ? `${stats.total} project${stats.total > 1 ? 's' : ''} total` : 'Manage your projects'}
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        )}
      </div>

      {!statsLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsConfig.map(({ key, label, color }) => (
            <div key={key} className="bg-white rounded-xl border border-zinc-200 px-4 py-3">
              <p className="text-2xl font-bold text-primary-900">{stats[key] || 0}</p>
              <p className={`text-xs font-medium ${color}`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <ProjectFilters onFilterChange={handleFilterChange} />

      <ProjectTable
        projects={projects}
        loading={isLoading}
        error={error}
        onRowClick={handleRowClick}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setQueryParams((p) => ({ ...p, page: pagination.page - 1 }))}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setQueryParams((p) => ({ ...p, page: pagination.page + 1 }))}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Project">
        <ProjectForm
          onSuccess={() => {
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}
