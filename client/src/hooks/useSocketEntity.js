import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getSocket, joinRoom, leaveRoom } from '../services/socket';

export default function useSocketEntity(entityType, entityId, { onUpdate } = {}) {
  const user = useSelector((state) => state.auth.user);
  const handlersRef = useRef({ onUpdate });
  handlersRef.current = { onUpdate };

  useEffect(() => {
    if (!user || !entityId) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = getSocket(token);
    const room = `${entityType}:${entityId}`;

    joinRoom(room);

    const handleUpdate = (data) => handlersRef.current.onUpdate?.(data);
    socket.on('entity:updated', handleUpdate);

    return () => {
      leaveRoom(room);
      socket.off('entity:updated', handleUpdate);
    };
  }, [user, entityType, entityId]);
}
