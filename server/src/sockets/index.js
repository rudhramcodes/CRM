import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../modules/auth/auth.model.js';
import logger from '../utils/logger.js';
import { registerNotificationHandlers } from './notificationSocket.js';

let io = null;

export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Auth middleware — verify JWT from handshake auth token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      socket.join(`user:${user._id}`);
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user?.name || socket.id}`);

    registerNotificationHandlers(io, socket);

    // Entity rooms — join when viewing a detail page
    socket.on('join:room', (room) => {
      if (typeof room !== 'string') return;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on('leave:room', (room) => {
      if (typeof room !== 'string') return;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.user?.name || socket.id} (${reason})`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

export const getIO = () => io;

/**
 * Emit an update event to all users viewing a specific entity.
 * Frontend useSocketEntity listens for 'entity:updated' and refetches.
 */
export const emitEntityUpdate = (entityType, entityId, action, data = {}) => {
  if (!io) return;
  io.to(`${entityType}:${entityId}`).emit('entity:updated', {
    entityType, entityId, action, ...data,
  });
};
