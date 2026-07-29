import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getSocket, disconnectSocket } from '../../../services/socket';

export default function useSocketNotifications({ onNew, onUnreadChange } = {}) {
  const handlersRef = useRef({ onNew, onUnreadChange });
  handlersRef.current = { onNew, onUnreadChange };
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = getSocket(token);

    const handleNew = (notification) => handlersRef.current.onNew?.(notification);
    const handleUnread = ({ count }) => handlersRef.current.onUnreadChange?.(count);

    socket.on('notification:new', handleNew);
    socket.on('notification:unread', handleUnread);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:unread', handleUnread);
    };
  }, [user]);

  const markRead = useCallback((notificationId) => {
    const token = localStorage.getItem('accessToken');
    const socket = getSocket(token);
    socket?.emit('notification:read', notificationId);
  }, []);

  const markAllRead = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    const socket = getSocket(token);
    socket?.emit('notification:readAll');
  }, []);

  return { markRead, markAllRead };
}
