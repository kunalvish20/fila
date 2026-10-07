import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { filamentsRouter } from './routes/filaments.js';
import { requestsRouter } from './routes/requests.js';
import { usageRouter } from './routes/usage.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { transactionsRouter } from './routes/transactions.js';
import { notificationsRouter } from './routes/notifications.js';
import { settingsRouter } from './routes/settings.js';
import { auditRouter } from './routes/audit.js';
import { prisma } from './lib/prisma.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((v) => v.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'filament-inventory-api', time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/filaments', filamentsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/usage', usageRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit', auditRouter);

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  console.log(`Filament Inventory API running on http://localhost:${config.PORT}`);
  if (config.DEV_AUTH_BYPASS) {
    console.log(`DEV_AUTH_BYPASS enabled. Local requests run as ${config.DEV_AUTH_BYPASS_EMAIL}. Do not use this in production.`);
  }
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
