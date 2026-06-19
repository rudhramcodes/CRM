import app from './app.js';
import config from './config/index.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

startServer();
