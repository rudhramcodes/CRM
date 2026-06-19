import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, Users, Columns3, LayoutList } from 'lucide-react';
import { useGetLeadsQuery, useGetLeadStatsQuery, useDeleteLeadMutation, useUpdateLeadMutation } from '../../../services/leadApi';
import LeadTable from '../components/LeadTable';
import LeadKanbanBoard from '../components/LeadKanbanBoard';
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
  const [view, setView] = useState('table');

  useEffect(() => {
    dispatch(setPageTitle('Leads'));
  }, [dispatch]);

  const { data: leadsData, isLoading, error } = useGetLeadsQuery(queryParams);
  const { data: kanbanData, isLoading: kanbanLoading } = useGetLeadsQuery(
    { limit: 100 },
    { skip: view !== 'board' },
  );
  const { data: statsData, isLoading: statsLoading } = useGetLeadStatsQuery();
  const [deleteLead] = useDeleteLeadMutation();
  const [updateLead] = useUpdateLeadMutation();

  const leads = leadsData?.data || [];
  const kanbanLeads = kanbanData?.data || [];
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

  const handleStatusChange = useCallback(async (leadId, newStatus) => {
    try {
      await updateLead({ id: leadId, status: newStatus }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update lead status');
    }
  }, [updateLead]);

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
        <div className="flex items-center gap-2">
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

      {/* Table / Board */}
      {view === 'table' ? (
        isLoading ? (
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
    </div>
  );
}
