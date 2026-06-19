import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, Users } from 'lucide-react';
import { useGetLeadsQuery, useGetLeadStatsQuery, useDeleteLeadMutation } from '../../../services/leadApi';
import LeadTable from '../components/LeadTable';
import LeadFilters from '../components/LeadFilters';
import LeadStatusBadge from '../components/LeadStatusBadge';
import Button from '../../../components/ui/Button';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';
import { LEAD_STATUS } from '../../../constants';
import toast from 'react-hot-toast';

export default function LeadList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({});

  useEffect(() => {
    dispatch(setPageTitle('Leads'));
  }, [dispatch]);

  const { data: leadsData, isLoading, error } = useGetLeadsQuery(queryParams);
  const { data: statsData, isLoading: statsLoading } = useGetLeadStatsQuery();
  const [deleteLead] = useDeleteLeadMutation();

  const leads = leadsData?.data || [];
  const pagination = leadsData?.pagination;
  const stats = statsData?.data || {};

  const handleFilterChange = useCallback((filters) => {
    setQueryParams({ ...filters, page: 1 });
  }, []);

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleEdit = useCallback((row) => {
    navigate(`/leads/${row._id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (row) => {
    if (!window.confirm(`Delete lead "${row.name}"? This cannot be undone.`)) return;
    try {
      await deleteLead(row._id).unwrap();
      toast.success('Lead deleted successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete lead');
    }
  }, [deleteLead]);

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
        {canCreate && (
          <Button onClick={() => navigate('/leads/new')}>
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        )}
      </div>

      {/* Stats */}
      {!statsLoading && stats.total > 0 && (
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

      {/* Filters */}
      <LeadFilters onFilterChange={handleFilterChange} />

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-12">
          <Loader size="lg" text="Loading leads..." />
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
        />
      )}
    </div>
  );
}
