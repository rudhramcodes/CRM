import { useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
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

  const { data, isLoading, isFetching } = useGetNotificationsQuery(filters);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();

  useEffect(() => {
    dispatch(setPageTitle('Notifications'));
  }, [dispatch]);

  const notifications = data?.data || [];
  const pagination = data?.pagination;

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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Notifications</h2>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-xs text-primary-900 hover:underline font-medium disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Filters */}
      <NotificationFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {/* Empty */}
      {!isLoading && notifications.length === 0 && (
        <div className="py-12">
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! New notifications will appear here."
          />
        </div>
      )}

      {/* List */}
      {!isLoading && notifications.length > 0 && (
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
