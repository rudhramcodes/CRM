import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, Users, Columns3, LayoutList, XCircle, Trash2, X, CheckSquare, Download, Upload } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import { useGetLeadsQuery, useGetLeadStatsQuery, useDeleteLeadMutation, useUpdateLeadMutation, useBulkDeleteLeadsMutation, useBulkUpdateLeadsMutation } from '../../../services/leadApi';
import LeadTable from '../components/LeadTable';
import LeadKanbanBoard from '../components/LeadKanbanBoard';
import LeadFilters from '../components/LeadFilters';
import LeadStatusBadge from '../components/LeadStatusBadge';
import LeadImportModal from '../components/LeadImportModal';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Modal from '../../../components/ui/Modal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { LEAD_STATUS, LEAD_BRANDS } from '../../../constants';
import { downloadLeadsCsv, downloadLeadsExcel, downloadLeadsPdf } from '../../../utils/exportLeads';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const BULK_STATUS_OPTIONS = LEAD_STATUS.filter((s) => !['won', 'lost'].includes(s.value));

export default function LeadList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10 });
  const [view, setView] = useState('table');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lostReasonTarget, setLostReasonTarget] = useState(null);
  const [lostReasonInput, setLostReasonInput] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
  const [bulkDeleteLeads, { isLoading: isBulkDeleting }] = useBulkDeleteLeadsMutation();
  const [bulkUpdateLeads, { isLoading: isBulkUpdating }] = useBulkUpdateLeadsMutation();

  const leads = leadsData?.data || [];
  const kanbanLeads = kanbanData?.data || [];
  const pagination = leadsData?.pagination;
  const stats = statsData?.data || {};

  const [activeBrand, setActiveBrand] = useState('');

  const handleBrandChange = useCallback((brand) => {
    setActiveBrand(brand);
    setSelectedIds([]);
    setQueryParams((prev) => {
      const next = { ...prev, page: 1 };
      if (brand) next.brand = brand;
      else delete next.brand;
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setSelectedIds([]);
    setQueryParams((prev) => {
      const next = { ...prev, page: 1 };
      for (const [key, val] of Object.entries(filters)) {
        if (val) next[key] = val;
        else delete next[key];
      }
      return next;
    });
  }, []);

  const canCreate = user && ['super_admin', 'admin', 'manager', 'employee'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager', 'employee'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);
  const canImport = user && ['super_admin', 'admin'].includes(user.role);

  const handleEdit = useCallback((row) => {
    navigate(`/leads/${row._id}`);
  }, [navigate]);

  const handleStatusChange = useCallback(async (leadId, newStatus) => {
    if (newStatus === 'lost') {
      setLostReasonTarget(leadId);
      setLostReasonInput('');
      return;
    }
    try {
      await updateLead({ id: leadId, status: newStatus }).unwrap();
      if (newStatus === 'won') {
        toast.success('Lead converted to client successfully');
        navigate('/clients');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update lead status');
    }
  }, [updateLead, navigate]);

  const confirmLostReason = useCallback(async () => {
    if (!lostReasonTarget) return;
    try {
      await updateLead({ id: lostReasonTarget, status: 'lost', lostReason: lostReasonInput.trim() || undefined }).unwrap();
      setLostReasonTarget(null);
      setLostReasonInput('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update lead status');
    }
  }, [lostReasonTarget, lostReasonInput, updateLead]);

  const handleDelete = useCallback((row) => setDeleteTarget(row), []);

  const handlePageChange = useCallback((newPage) => {
    setSelectedIds([]);
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handlePageSizeChange = useCallback((newLimit) => {
    setSelectedIds([]);
    setQueryParams((prev) => ({ ...prev, page: 1, limit: newLimit }));
  }, []);

  const handleSelectionChange = useCallback((ids) => setSelectedIds(ids), []);

  const selectedLeads = leads.filter((l) => selectedIds.includes(l._id));

  const confirmBulkDelete = useCallback(async () => {
    try {
      await bulkDeleteLeads(selectedIds).unwrap();
      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'lead' : 'leads'} deleted successfully`);
      setBulkDeleteOpen(false);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete leads');
    }
  }, [bulkDeleteLeads, selectedIds]);

  const handleBulkStatusChange = useCallback(async (status) => {
    try {
      await bulkUpdateLeads({ ids: selectedIds, data: { status } }).unwrap();
      toast.success('Leads updated successfully');
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update leads');
    }
  }, [bulkUpdateLeads, selectedIds]);

  const handleDownload = useCallback((format) => {
    if (!selectedLeads.length) return;
    if (format === 'csv') downloadLeadsCsv(selectedLeads);
    else if (format === 'excel') downloadLeadsExcel(selectedLeads);
    else if (format === 'pdf') downloadLeadsPdf(selectedLeads);
  }, [selectedLeads]);

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
            <RefreshCwIcon className={`w-4 h-4 ${isFetchingLeads ? 'animate-spin' : ''}`} />
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
          {canImport && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4" />
              Import
            </Button>
          )}
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

      {/* Bulk actions bar */}
      <AnimatePresence>
        {view === 'table' && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/80 px-4 py-2.5 shadow-sm"
          >
            <div className="flex items-center gap-2 mr-auto">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-900/10">
                <CheckSquare className="w-3.5 h-3.5 text-primary-900" />
              </span>
              <span className="text-sm font-medium text-primary-900">
                {selectedIds.length} {selectedIds.length === 1 ? 'lead' : 'leads'} selected
              </span>
            </div>

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                loading={isBulkDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            )}

            <Select onValueChange={(val) => handleBulkStatusChange(val)} disabled={isBulkUpdating}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {BULK_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(val) => handleDownload(val)}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <SelectValue placeholder="Download" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            selectable
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
          />
        )
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 min-h-[500px]">
          <LeadKanbanBoard
            leads={kanbanLeads}
            loading={kanbanLoading}
            onLeadClick={(lead) => navigate(`/leads/${lead._id}`)}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      <Modal
        open={!!lostReasonTarget}
        onClose={() => setLostReasonTarget(null)}
        title="Mark Lead as Lost"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <p className="text-sm text-zinc-600">Please provide a reason for marking this lead as lost.</p>
          </div>
          <textarea
            value={lostReasonInput}
            onChange={(e) => setLostReasonInput(e.target.value)}
            placeholder="e.g. Price too high, went with competitor, not interested..."
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none"
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setLostReasonTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmLostReason}>
              Confirm Lost
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Lead?"
        message={deleteTarget ? `Delete lead "${deleteTarget.name}"? This cannot be undone.` : ''}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Leads?"
        message={`Delete ${selectedIds.length} selected ${selectedIds.length === 1 ? 'lead' : 'leads'}? This cannot be undone.`}
        confirmLabel={isBulkDeleting ? 'Deleting...' : 'Delete'}
      />

      <LeadImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

