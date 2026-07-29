import { io } from 'socket.io-client';
import { API_BASE_URL } from '../constants';

let socket = null;
let currentToken = null;

export const getSocket = (token) => {
  if (socket?.connected && token === currentToken) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = token;
  const socketUrl = API_BASE_URL.replace('/api', '');
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};

export const joinRoom = (room) => {
  if (socket?.connected) socket.emit('join:room', room);
};

export const leaveRoom = (room) => {
  if (socket?.connected) socket.emit('leave:room', room);
};
