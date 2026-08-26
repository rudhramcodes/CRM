import { useState, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from '../../../services/notificationApi';
import NotificationItem from '../components/NotificationItem';
import NotificationFilters from '../components/NotificationFilters';
import EmptyState from '../../../components/ui/EmptyState';
import Loader from '../../../components/ui/Loader';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useEffect } from 'react';

export default function NotificationList() {
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({ limit: 20, page: 1 });

  const { data, isLoading, isFetching, isError, refetch } = useGetNotificationsQuery(filters);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();

  useEffect(() => {
    dispatch(setPageTitle('Notifications'));
  }, [dispatch]);

  const notifications = data?.data || [];
  const pagination = data?.pagination;
  const unreadOnPage = notifications.filter((notification) => !notification.read).length;

  const handleMarkRead = useCallback((id) => {
    markRead(id);
  }, [markRead]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead().unwrap();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  }, [markAllRead]);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteNotif(id).unwrap();
    } catch {
      toast.error('Failed to delete notification');
    }
  }, [deleteNotif]);

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[#DCC19D] bg-gradient-to-br from-[#F6F0DF] to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3A2415] text-[#F6F0DF] shadow-sm">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-[#3A2415]">Notifications</h2>
              <p className="mt-0.5 text-xs text-[#3A2415]/65">Stay on top of invoices, payments, tasks and team activity.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-full border border-[#DCC19D] bg-white/70 px-2.5 py-1 text-xs font-medium text-[#3A2415]">
              {unreadOnPage > 0 ? `${unreadOnPage} unread here` : 'All caught up'}
            </span>
            {unreadOnPage > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                aria-label="Mark all notifications as read"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A2415] px-3 py-2 text-xs font-medium text-[#F6F0DF] transition hover:bg-[#2a190f] disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {markingAll ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <NotificationFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Error */}
      {!isLoading && isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Notifications could not be loaded.</p>
          <p className="mt-1 text-xs text-red-600">Check your connection and try again.</p>
          <button type="button" onClick={refetch} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">
            <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      )}
      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && notifications.length === 0 && (
        <div className="py-12">
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! New notifications will appear here."
          />
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && notifications.length > 0 && (
        <>
          {isFetching && (
            <div className="text-center py-2 text-xs text-zinc-400">Updating...</div>
          )}
          <div className="mt-2 bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                aria-label="Go to previous notifications page"
                disabled={!pagination.hasPrevPage}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 text-xs rounded border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                aria-label="Go to next notifications page"
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 text-xs rounded border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
