import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, LayoutList, CalendarDays } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import { useGetMeetingsQuery, useUpdateMeetingMutation, useDeleteMeetingMutation } from '../../../services/meetingApi';
import MeetingTable from '../components/MeetingTable';
import MeetingFilters from '../components/MeetingFilters';
import MeetingForm from '../components/MeetingForm';
import CalendarView from '../components/CalendarView';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
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

  useEffect(() => {
    dispatch(setPageTitle('Meetings'));
  }, [dispatch]);

  const { data: meetingsData, isLoading, error, refetch: refetchMeetings, isFetching: isFetchingMeetings } = useGetMeetingsQuery(queryParams);
  const [updateMeeting] = useUpdateMeetingMutation();
  const [deleteMeeting] = useDeleteMeetingMutation();

  const meetings = meetingsData?.data || [];
  const pagination = meetingsData?.pagination;

  const handleFilterChange = useCallback((filters) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    setQueryParams(params);
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

  const handleStatusChange = useCallback(async (meetingId, status) => {
    try {
      await updateMeeting({ id: meetingId, status }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  }, [updateMeeting]);

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

  const handlePageChange = useCallback(
    (page) => {
      setQueryParams((prev) => ({ ...prev, page }));
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Meetings</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Schedule and manage meetings with leads and clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'list' ? 'bg-primary-50 text-primary-900' : 'text-zinc-400 hover:text-primary-900',
              )}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'calendar' ? 'bg-primary-50 text-primary-900' : 'text-zinc-400 hover:text-primary-900',
              )}
              title="Calendar view"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => refetchMeetings()}
            disabled={isFetchingMeetings}
            className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            title="Refresh meetings"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetchingMeetings ? 'animate-spin' : ''}`} />
          </button>
          {canCreate && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              Schedule Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <MeetingFilters onFilterChange={handleFilterChange} />

      {/* Table / Calendar */}
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
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => handlePageChange(pagination.page - 1)}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg disabled:opacity-40 hover:bg-zinc-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => handlePageChange(pagination.page + 1)}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg disabled:opacity-40 hover:bg-zinc-50 transition-colors"
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

      {deleteTarget?.seriesId ? (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Recurring Meeting?"
          message={`"${deleteTarget.title}" is part of a recurring series.`}
        >
          <div className="flex flex-col gap-2">
            <Button variant="danger" size="sm" onClick={confirmDelete}>
              Delete this occurrence only
            </Button>
            <Button variant="secondary" size="sm" onClick={confirmDeleteSeries}>
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
          message={deleteTarget ? `Delete meeting "${deleteTarget.title}"? This cannot be undone.` : ''}
        />
      )}
    </div>
  );
}
