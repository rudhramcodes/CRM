import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, Users, Columns3, LayoutList, RefreshCw } from 'lucide-react';
import { useGetLeadsQuery, useGetLeadStatsQuery, useDeleteLeadMutation, useUpdateLeadMutation } from '../../../services/leadApi';
import LeadTable from '../components/LeadTable';
import LeadKanbanBoard from '../components/LeadKanbanBoard';
import LeadFilters from '../components/LeadFilters';
import LeadStatusBadge from '../components/LeadStatusBadge';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { LEAD_STATUS, LEAD_BRANDS } from '../../../constants';
import toast from 'react-hot-toast';

export default function LeadList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10 });
  const [view, setView] = useState('table');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    dispatch(setPageTitle('Leads'));
  }, [dispatch]);

  const { data: leadsData, isLoading, error, refetch: refetchLeads, isFetching: isFetchingLeads } = useGetLeadsQuery(queryParams);
  const { data: kanbanData, isLoading: kanbanLoading } = useGetLeadsQuery(
    { limit: 100 },
    { skip: view !== 'board' },
  );
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useGetLeadStatsQuery();
  const [deleteLead] = useDeleteLeadMutation();
  const [updateLead] = useUpdateLeadMutation();

  const leads = leadsData?.data || [];
  const kanbanLeads = kanbanData?.data || [];
  const pagination = leadsData?.pagination;
  const stats = statsData?.data || {};

  const [activeBrand, setActiveBrand] = useState('');

  const handleBrandChange = useCallback((brand) => {
    setActiveBrand(brand);
    setQueryParams((prev) => {
      const next = { ...prev, page: 1 };
      if (brand) next.brand = brand;
      else delete next.brand;
      return next;
    });
  }, []);

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

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleEdit = useCallback((row) => {
    navigate(`/leads/${row._id}`);
  }, [navigate]);

  const handleStatusChange = useCallback(async (leadId, newStatus) => {
    try {
      await updateLead({ id: leadId, status: newStatus }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update lead status');
    }
  }, [updateLead]);

  const handleDelete = useCallback((row) => setDeleteTarget(row), []);

  const handlePageChange = useCallback((newPage) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handlePageSizeChange = useCallback((newLimit) => {
    setQueryParams((prev) => ({ ...prev, page: 1, limit: newLimit }));
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead(deleteTarget._id).unwrap();
      toast.success('Lead deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete lead');
    }
  }, [deleteTarget, deleteLead]);

  const statCards = LEAD_STATUS.map((s) => ({
    label: s.label,
    value: stats[s.value] || 0,
    status: s.value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Leads</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Track and manage your sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetchLeads(); refetchStats(); }}
            disabled={isFetchingLeads}
            className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            title="Refresh leads"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingLeads ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md text-sm transition-colors ${
                view === 'table' ? 'bg-white text-primary-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('board')}
              className={`p-1.5 rounded-md text-sm transition-colors ${
                view === 'board' ? 'bg-white text-primary-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title="Board view"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {canCreate && (
            <Button onClick={() => navigate('/leads/new')}>
              <Plus className="w-4 h-4" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((card) => (
            <div
              key={card.status}
              className="bg-white rounded-xl border border-zinc-200 p-4 text-center"
            >
              <p className="text-2xl font-semibold text-primary-900">{card.value}</p>
              <div className="mt-1 flex justify-center">
                <LeadStatusBadge status={card.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleBrandChange('')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            !activeBrand
              ? 'bg-primary-900 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          All
        </button>
        {LEAD_BRANDS.map((b) => (
          <button
            key={b.value}
            onClick={() => handleBrandChange(b.value)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeBrand === b.value
                ? 'bg-primary-900 text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <LeadFilters onFilterChange={handleFilterChange} />

      {/* Table / Board */}
      {view === 'table' ? (
        isLoading ? (
          <div className="bg-white rounded-xl border border-zinc-200">
            <TableSkeleton rows={5} />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-12">
            <EmptyState
              icon={Users}
              title="Failed to load leads"
              description={error?.data?.message || 'Something went wrong. Please try again.'}
            />
          </div>
        ) : (
          <LeadTable
            leads={leads}
            loading={false}
            error={null}
            onRowClick={(row) => navigate(`/leads/${row._id}`)}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            serverPagination
            page={pagination?.page || 1}
            pageSize={pagination?.limit || 10}
            total={pagination?.total}
            totalPages={pagination?.pages}
            hasNextPage={pagination?.hasNextPage}
            hasPrevPage={pagination?.hasPrevPage}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <LeadKanbanBoard
            leads={kanbanLeads}
            loading={kanbanLoading}
            onLeadClick={(lead) => navigate(`/leads/${lead._id}`)}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Lead?"
        message={deleteTarget ? `Delete lead "${deleteTarget.name}"? This cannot be undone.` : ''}
      />
    </div>
  );
}

