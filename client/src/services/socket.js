import { io } from 'socket.io-client';
import { API_BASE_URL } from '../constants';

let socket = null;
let currentToken = null;
let isRefreshing = false;
const joinedRooms = new Set();

const getSocketUrl = () => {
  const base = API_BASE_URL || '/api';
  const stripped = base.replace(/\/api\/?$/, '');
  return stripped || '/';
};

const rejoinRooms = () => {
  if (!socket) return;
  joinedRooms.forEach((room) => socket.emit('join:room', room));
};

const refreshAccessToken = async () => {
  if (isRefreshing) return null;
  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
    });
    const body = await res.json();
    const newToken = body?.data?.accessToken;
    if (newToken) {
      localStorage.setItem('accessToken', newToken);
      return newToken;
    }
  } catch {
    return null;
  } finally {
    isRefreshing = false;
  }
};

const reconnectWithFreshToken = async () => {
  const freshToken = await refreshAccessToken();
  if (!freshToken || !socket) return;
  currentToken = freshToken;
  socket.auth = { token: freshToken };
  socket.disconnect();
  socket.connect();
};

export const getSocket = (token) => {
  if (socket && token === currentToken) return socket;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = token;
  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });
  // Rooms do not survive reconnects server-side, so re-join on every connect.
  socket.on('connect', rejoinRooms);
  socket.on('connect_error', (err) => {
    if (err?.message === 'Invalid token' || err?.message === 'Authentication required') {
      reconnectWithFreshToken();
    }
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
    joinedRooms.clear();
  }
};

export const joinRoom = (room) => {
  if (!socket) return;
  joinedRooms.add(room);
  // socket.io-client buffers emits until connected.
  socket.emit('join:room', room);
};

export const leaveRoom = (room) => {
  if (!socket) return;
  joinedRooms.delete(room);
  if (socket.connected) {
    socket.emit('leave:room', room);
  }
};