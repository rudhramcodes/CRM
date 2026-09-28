import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  Plus,
  LayoutList,
  CalendarDays,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import {
  useGetMeetingsQuery,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
} from '../../../services/meetingApi';
import MeetingTable from '../components/MeetingTable';
import MeetingFilters from '../components/MeetingFilters';
import MeetingForm from '../components/MeetingForm';
import CalendarView from '../components/CalendarView';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

export default function MeetingList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [view, setView] = useState('list');
  const [activeBrand, setActiveBrand] = useState('');

  useEffect(() => {
    dispatch(setPageTitle('Meetings'));
  }, [dispatch]);

  const {
    data: meetingsData,
    isLoading,
    error,
    refetch: refetchMeetings,
    isFetching: isFetchingMeetings,
  } = useGetMeetingsQuery(queryParams);

  const [updateMeeting] = useUpdateMeetingMutation();
  const [deleteMeeting] = useDeleteMeetingMutation();

  const meetings = meetingsData?.data || [];
  const pagination = meetingsData?.pagination;

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
      const filterKeys = ['search', 'status', 'client', 'dateFrom', 'dateTo'];
      filterKeys.forEach((k) => delete next[k]);
      for (const [key, val] of Object.entries(filters)) {
        if (val) next[key] = val;
      }
      return next;
    });
  }, []);

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleEdit = useCallback(
    (row) => {
      navigate(`/meetings/${row._id}`);
    },
    [navigate],
  );

  const handleStatusChange = useCallback(
    async (meetingId, status) => {
      try {
        await updateMeeting({ id: meetingId, status }).unwrap();
        toast.success(`Meeting status changed to ${status}`);
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update status');
      }
    },
    [updateMeeting],
  );

  const handleDelete = useCallback((row) => setDeleteTarget(row), []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMeeting({ id: deleteTarget._id }).unwrap();
      toast.success('Meeting deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete meeting');
    }
  }, [deleteTarget, deleteMeeting]);

  const confirmDeleteSeries = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMeeting({ id: deleteTarget._id, allSeries: true }).unwrap();
      toast.success('Recurring series deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete series');
    }
  }, [deleteTarget, deleteMeeting]);

  const handleDayClick = useCallback((key) => {
    setQueryParams((prev) => {
      if (prev.dateFrom === key && prev.dateTo === key) {
        const { dateFrom, dateTo, ...rest } = prev;
        return rest;
      }
      return { ...prev, dateFrom: key, dateTo: key };
    });
  }, []);

  const handlePageChange = useCallback((page) => {
    setQueryParams((prev) => ({ ...prev, page }));
  }, []);

  // Compute KPI stats from loaded meetings
  const totalMeetings = meetings.length;
  const scheduledCount = meetings.filter((m) => m.status === 'scheduled').length;
  const completedCount = meetings.filter((m) => m.status === 'completed').length;
  const cancelledCount = meetings.filter((m) => m.status === 'cancelled').length;

  const kpis = [
    {
      title: 'Total Sessions',
      value: totalMeetings,
      desc: 'All recorded appointments',
      icon: Calendar,
      iconColor: 'text-zinc-700 bg-zinc-100',
    },
    {
      title: 'Upcoming / Scheduled',
      value: scheduledCount,
      desc: 'Pending syncs & briefings',
      icon: Clock,
      iconColor: 'text-sky-600 bg-sky-50',
    },
    {
      title: 'Completed Sessions',
      value: completedCount,
      desc: 'Successfully held meetings',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Cancelled / Postponed',
      value: cancelledCount,
      desc: 'Voided discussions',
      icon: XCircle,
      iconColor: 'text-rose-600 bg-rose-50',
    },
  ];

  // Brand counts
  const brandCounts = useMemo(() => {
    const map = {};
    meetings.forEach((m) => {
      const b = m.brand || m.client?.brand || m.lead?.brand;
      if (b) map[b] = (map[b] || 0) + 1;
    });
    return map;
  }, [meetings]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
            Meetings & Briefings
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Coordinate video appointments, discussions, and follow-up agendas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-zinc-100/90 rounded-xl p-1 border border-zinc-200/80 shadow-2xs">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                view === 'list'
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800',
              )}
              title="List view"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                view === 'calendar'
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800',
              )}
              title="Calendar view"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => refetchMeetings()}
            disabled={isFetchingMeetings}
            className="p-2 rounded-xl text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50 border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95"
            title="Refresh meetings"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetchingMeetings ? 'animate-spin' : ''}`} />
          </button>

          {/* Schedule Meeting CTA */}
          {canCreate && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl text-xs font-semibold shadow-md shadow-primary-900/10"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Schedule Meeting
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {kpi.title}
                </span>
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                    kpi.iconColor,
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-900 tracking-tight">
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

      {/* Venture Brand Switcher Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => handleBrandChange('')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border',
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
            {totalMeetings}
          </span>
        </button>

        {LEAD_BRANDS.map((b) => {
          const count = brandCounts[b.value] || 0;
          const meta = BRAND_METAS[b.value];
          const isSelected = activeBrand === b.value;

          return (
            <button
              key={b.value}
              onClick={() => handleBrandChange(b.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border',
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
              ) : (
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-br',
                    meta?.gradient || 'from-zinc-600 to-zinc-800',
                  )}
                >
                  {meta?.initial || b.label?.[0]}
                </div>
              )}
              <span>{b.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <MeetingFilters onFilterChange={handleFilterChange} />

      {/* Table / Calendar View */}
      {view === 'calendar' ? (
        <CalendarView
          meetings={meetings}
          onDayClick={handleDayClick}
          onMeetingClick={(m) => navigate(`/meetings/${m._id}`)}
        />
      ) : (
        <MeetingTable
          meetings={meetings}
          loading={isLoading}
          error={error}
          onRowClick={(row) => navigate(`/meetings/${row._id}`)}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => handlePageChange(pagination.page - 1)}
            className="px-3.5 py-1.5 text-xs font-semibold border border-zinc-200/80 bg-white rounded-xl disabled:opacity-40 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-zinc-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => handlePageChange(pagination.page + 1)}
            className="px-3.5 py-1.5 text-xs font-semibold border border-zinc-200/80 bg-white rounded-xl disabled:opacity-40 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Meeting"
        size="lg"
      >
        <MeetingForm
          onSuccess={() => setShowCreateModal(false)}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Delete Dialog */}
      {deleteTarget?.seriesId ? (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Recurring Meeting?"
          message={`"${deleteTarget.title}" is part of a recurring series.`}
        >
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="danger" size="sm" onClick={confirmDelete} className="rounded-xl">
              Delete this occurrence only
            </Button>
            <Button variant="secondary" size="sm" onClick={confirmDeleteSeries} className="rounded-xl">
              Delete entire series
            </Button>
          </div>
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title="Delete Meeting?"
          message={
            deleteTarget
              ? `Are you sure you want to delete meeting "${deleteTarget.title}"? This cannot be undone.`
              : ''
          }
        />
      )}
    </div>
  );
}

