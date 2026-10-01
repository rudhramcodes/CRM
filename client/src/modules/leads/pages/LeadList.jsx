import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  Plus,
  Users,
  Columns3,
  LayoutList,
  XCircle,
  X,
  CheckSquare,
  Download,
  Upload,
  TrendingUp,
  Sparkles,
  PhoneCall,
  CalendarCheck,
  FileCheck2,
  Trophy,
} from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import {
  useGetLeadsQuery,
  useGetLeadStatsQuery,
  useUpdateLeadMutation,
  useBulkUpdateLeadsMutation,
} from '../../../services/leadApi';
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
import { LEAD_STATUS, LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import { downloadLeadsCsv, downloadLeadsExcel, downloadLeadsPdf } from '../../../utils/exportLeads';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';

const BRAND_LABELS = LEAD_BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});
const BULK_STATUS_OPTIONS = LEAD_STATUS.filter((s) => !['won', 'lost'].includes(s.value));

export default function LeadList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10 });
  const [view, setView] = useState('table');
  const [lostReasonTarget, setLostReasonTarget] = useState(null);
  const [lostReasonInput, setLostReasonInput] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState('');

  useEffect(() => {
    dispatch(setPageTitle('Leads'));
  }, [dispatch]);

  const { data: leadsData, isLoading, error, refetch: refetchLeads, isFetching: isFetchingLeads } = useGetLeadsQuery(queryParams);
  const { data: kanbanData, isLoading: kanbanLoading } = useGetLeadsQuery(
    { limit: 100 },
    { skip: view !== 'board' },
  );
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useGetLeadStatsQuery();
  const [updateLead] = useUpdateLeadMutation();
  const [bulkUpdateLeads, { isLoading: isBulkUpdating }] = useBulkUpdateLeadsMutation();

  const leads = leadsData?.data || [];
  const kanbanLeads = kanbanData?.data || [];
  const pagination = leadsData?.pagination;
  const stats = statsData?.data || {};

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
      toast.success('Lead marked as lost');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update lead status');
    }
  }, [lostReasonTarget, lostReasonInput, updateLead]);

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

  // Derived KPI metrics
  const totalCount = stats.total || 0;
  const newCount = stats.new || 0;
  const contactedCount = stats.contacted || 0;
  const inPipelineCount = (stats.meeting_scheduled || 0) + (stats.proposal_sent || 0);
  const wonCount = stats.won || 0;
  const winRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  const kpis = [
    {
      title: 'Total Pipeline',
      value: totalCount,
      desc: 'All recorded inquiries',
      icon: Users,
      iconColor: 'text-zinc-700 bg-zinc-100',
    },
    {
      title: 'New Inquiries',
      value: newCount,
      desc: 'Pending initial outreach',
      icon: Sparkles,
      iconColor: 'text-sky-600 bg-sky-50',
    },
    {
      title: 'Contacted',
      value: contactedCount,
      desc: 'In dialogue / qualification',
      icon: PhoneCall,
      iconColor: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'Active Deal Stages',
      value: inPipelineCount,
      desc: 'Meeting or proposal sent',
      icon: CalendarCheck,
      iconColor: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Won & Converted',
      value: wonCount,
      desc: `${winRate}% conversion rate`,
      icon: Trophy,
      iconColor: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
            Leads Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Track, qualify, and convert business inquiries across all ventures
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Refresh Action */}
          <button
            onClick={() => {
              refetchLeads();
              refetchStats();
            }}
            disabled={isFetchingLeads}
            className="p-2 rounded-xl text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50 border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95"
            title="Refresh pipeline data"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetchingLeads ? 'animate-spin' : ''}`} />
          </button>

          {/* Segmented View Switcher */}
          <div className="flex items-center bg-zinc-100/90 rounded-xl p-1 border border-zinc-200/80">
            <button
              onClick={() => setView('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                view === 'table'
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800',
              )}
              title="Tabular list view"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                view === 'board'
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800',
              )}
              title="Kanban stage board"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>

          {/* Import Button */}
          {canImport && (
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="rounded-xl border-zinc-200/80 text-xs shadow-2xs font-semibold px-2.5 sm:px-3"
            >
              <Upload className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          )}

          {/* Add Lead CTA */}
          {canCreate && (
            <Button
              onClick={() => navigate('/leads/new')}
              className="rounded-xl text-xs font-semibold shadow-md shadow-primary-900/10 px-3 py-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Lead</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const isFeaturedWon = idx === 4;
            return (
              <div
                key={idx}
                className={cn(
                  'bg-white rounded-2xl border border-zinc-200/80 p-3.5 sm:p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 flex flex-col justify-between',
                  isFeaturedWon && 'col-span-2 sm:col-span-1',
                )}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {kpi.title}
                  </span>
                  <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', kpi.iconColor)}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                </div>
                <div className={cn(isFeaturedWon ? 'flex sm:block items-baseline justify-between sm:justify-start gap-2' : '')}>
                  <p className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate font-normal">
                    {kpi.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Venture Brand Switcher Tab Bar */}
      <div className="-mx-2 px-2 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
        <button
          onClick={() => handleBrandChange('')}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border',
            !activeBrand
              ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
              : 'bg-white text-zinc-600 hover:text-primary-900 hover:bg-zinc-50 border-zinc-200/80',
          )}
        >
          <span>All Ventures</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px]',
              !activeBrand ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500',
            )}
          >
            {totalCount}
          </span>
        </button>

        {LEAD_BRANDS.map((b) => {
          const count = stats.byBrand?.[b.value] || 0;
          const meta = BRAND_METAS[b.value];
          const isSelected = activeBrand === b.value;

          return (
            <button
              key={b.value}
              onClick={() => handleBrandChange(b.value)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border',
                isSelected
                  ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-primary-900 hover:bg-zinc-50 border-zinc-200/80',
              )}
            >
              {meta?.logo ? (
                <img
                  src={meta.logo}
                  alt={b.label}
                  className="w-4 h-4 rounded-sm object-contain shrink-0"
                />
              ) : meta ? (
                <div
                  className={cn(
                    'w-4 h-4 rounded-sm flex items-center justify-center text-[9px] text-white shrink-0 bg-gradient-to-br',
                    meta.gradient,
                  )}
                >
                  {b.label[0]}
                </div>
              ) : null}
              <span>{b.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <LeadFilters onFilterChange={handleFilterChange} />

      {/* Animated Floating Bulk Action Bar */}
      <AnimatePresence>
        {view === 'table' && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.15)] sticky top-16 sm:top-20 z-20"
          >
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-primary-900 text-white text-xs font-bold shadow-2xs">
                  {selectedIds.length}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-primary-900">
                  {selectedIds.length === 1 ? '1 lead' : `${selectedIds.length} leads`} selected
                </span>
              </div>
              <button
                onClick={() => setSelectedIds([])}
                className="sm:hidden p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 sm:flex-initial">
                <Select onValueChange={(val) => handleBulkStatusChange(val)} disabled={isBulkUpdating}>
                  <SelectTrigger className="h-8 sm:h-9 w-full sm:w-auto gap-1.5 text-xs font-medium rounded-xl border-zinc-200/90 shadow-2xs">
                    <SelectValue placeholder="Update stage" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                    {BULK_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 sm:flex-initial">
                <Select onValueChange={(val) => handleDownload(val)}>
                  <SelectTrigger className="h-8 sm:h-9 w-full sm:w-auto gap-1.5 text-xs font-medium rounded-xl border-zinc-200/90 shadow-2xs">
                    <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                    <SelectItem value="csv">Download CSV</SelectItem>
                    <SelectItem value="excel">Download Excel</SelectItem>
                    <SelectItem value="pdf">Download PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={() => setSelectedIds([])}
                className="hidden sm:flex p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors ml-1 cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area: Table or Kanban */}
      {view === 'table' ? (
        isLoading ? (
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs">
            <TableSkeleton rows={6} />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center shadow-2xs">
            <EmptyState
              icon={Users}
              title="Failed to load leads"
              description={error?.data?.message || 'Something went wrong. Please try refreshing.'}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] overflow-hidden">
            <LeadTable
              leads={leads}
              loading={false}
              error={null}
              onRowClick={(row) => navigate(`/leads/${row._id}`)}
              canEdit={canEdit}
              onEdit={handleEdit}
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
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 min-h-[500px] shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          <LeadKanbanBoard
            leads={kanbanLeads}
            loading={kanbanLoading}
            onLeadClick={(lead) => navigate(`/leads/${lead._id}`)}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Lost Reason Modal */}
      <Modal
        open={!!lostReasonTarget}
        onClose={() => setLostReasonTarget(null)}
        title="Mark Lead as Lost"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50/70 border border-red-200/80 text-red-700">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm">
              Please specify the reason for losing this opportunity to help improve future conversion.
            </p>
          </div>
          <textarea
            value={lostReasonInput}
            onChange={(e) => setLostReasonInput(e.target.value)}
            placeholder="e.g. Budget mismatch, chose competitor, deferred to next quarter..."
            className="w-full px-3.5 py-2.5 border border-zinc-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 resize-none shadow-2xs"
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLostReasonTarget(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmLostReason} className="rounded-xl text-xs">
              Confirm Lost
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lead CSV Import Modal */}
      <LeadImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
