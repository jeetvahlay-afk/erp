const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const requestContext = require('./middleware/requestContext');
const csrfProtection = require('./middleware/csrfMiddleware');
const apiResponseMiddleware = require('./middleware/apiResponseMiddleware');
const AppError = require('./utils/AppError');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const roleRoutes = require('./routes/roleRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const dailyBreakRoutes = require('./routes/dailyBreakRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const profileRequestRoutes = require('./routes/profileRequestRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const breakLogRoutes = require('./routes/breakLogRoutes');
const breakRequestRoutes = require('./routes/breakRequestRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const chatRoutes = require('./routes/chatRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workReportRoutes = require('./routes/workReportRoutes');

const app = express();
if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(requestContext);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: env.isProduction ? undefined : false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError('Origin is not allowed by CORS policy', 403, 'CORS_BLOCKED'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-Id', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-Id', 'X-Total-Count'],
  maxAge: 86400,
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: env.requestBodyLimit }));
app.use(csrfProtection);
app.use(apiResponseMiddleware);

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isProduction ? 'combined' : 'dev', { skip: (req) => req.path === '/api/health' }));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 1000 : 5000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later', code: 'RATE_LIMITED' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later', code: 'AUTH_RATE_LIMITED' },
});
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use('/uploads/chat', express.static(path.resolve(__dirname, '../../uploads/chat')));
app.use('/uploads/avatars', express.static(path.resolve(__dirname, '../../uploads/avatars')));
app.use('/uploads/documents', express.static(path.resolve(__dirname, '../../uploads/documents')));
app.get('/', (_req, res) => res.json({ name: 'TeamHub ERP API', version: '3.0.0' }));
app.get('/api/health', (_req, res) => {
  const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const database = databaseStates[mongoose.connection.readyState] || 'unknown';
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/daily-breaks', dailyBreakRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/profile-requests', profileRequestRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/breaks', breakLogRoutes);
app.use('/api/break-requests', breakRequestRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/work-reports', workReportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
