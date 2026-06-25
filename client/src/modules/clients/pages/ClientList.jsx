import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, UserCheck } from 'lucide-react';
import { useGetClientsQuery, useGetClientStatsQuery, useDeleteClientMutation } from '../../../services/clientApi';
import ClientTable from '../components/ClientTable';
import ClientFilters from '../components/ClientFilters';
import Button from '../../../components/ui/Button';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export default function ClientList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(setPageTitle('Clients'));
  }, [dispatch]);

  const { data: clientsData, isLoading, error } = useGetClientsQuery(queryParams);
  const { data: statsData, isLoading: statsLoading } = useGetClientStatsQuery();
  const [deleteClient] = useDeleteClientMutation();

  const clients = clientsData?.data || [];
  const pagination = clientsData?.pagination;
  const stats = statsData?.data || {};

  const handleFilterChange = useCallback((filters) => {
    setQueryParams({ ...filters, page: 1 });
  }, []);

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleEdit = useCallback((row) => {
    navigate(`/clients/${row._id}`);
  }, [navigate]);

  const handleDelete = useCallback((row) => setDeleteTarget(row), []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteClient(deleteTarget._id).unwrap();
      toast.success('Client deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete client');
    }
  }, [deleteTarget, deleteClient]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Clients</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your client relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => navigate('/clients/new')}>
              <Plus className="w-4 h-4" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!statsLoading && stats.total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
            <p className="text-2xl font-semibold text-primary-900">{stats.total}</p>
            <p className="text-xs text-zinc-500 mt-1">Total Clients</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
            <p className="text-2xl font-semibold text-green-700">{stats.active || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">Active</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
            <p className="text-2xl font-semibold text-red-700">{stats.inactive || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">Inactive</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <ClientFilters onFilterChange={handleFilterChange} />

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12">
          <Loader size="lg" text="Loading clients..." />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12">
          <EmptyState
            icon={UserCheck}
            title="Failed to load clients"
            description={error?.data?.message || 'Something went wrong. Please try again.'}
          />
        </div>
      ) : (
        <ClientTable
          clients={clients}
          loading={false}
          error={null}
          onRowClick={(row) => navigate(`/clients/${row._id}`)}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Client?"
        message={deleteTarget ? `Delete client "${deleteTarget.companyName}"? This cannot be undone.` : ''}
      />
    </div>
  );
}
