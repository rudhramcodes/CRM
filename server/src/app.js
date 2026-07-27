import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import config from './config/index.js';
import errorHandler from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';
import logger from './utils/logger.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import leadRoutes from './modules/leads/lead.routes.js';
import clientRoutes from './modules/clients/client.routes.js';
import meetingRoutes from './modules/meetings/meeting.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import templateRoutes from './modules/templates/template.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

const isDev = config.nodeEnv === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});

// Skip rate limiter in dev (annoying during development) and for reports
app.use('/api', (req, res, next) => {
  if (isDev || req.path.startsWith('/reports')) return next();
  return limiter(req, res, next);
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

app.use(mongoSanitize());

const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'CRM API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    port: config.port,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((_req, _res, next) => {
  next(ApiError.notFound('Route not found'));
});

app.use(errorHandler);

export default app;
