import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import practiceRoutes from './routes/practice.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  const configuredOrigin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5179';
  app.use(cors({ origin: [configuredOrigin, 'http://localhost:5179'] }));
  app.use(express.json({ limit: '128kb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.get('/api/health', (_request, response) => response.json({ status: 'ok', aiFeatures: 'disabled' }));
  app.use('/api/auth', authRoutes);
  app.use('/api', practiceRoutes);
  app.use((error, _request, response, _next) => {
    const status = error?.status === 429 ? 429 : error?.status || 502;
    const message = process.env.NODE_ENV === 'production'
      ? 'The request could not be completed. Check service configuration and try again.'
      : error?.message || 'The request could not be completed.';
    return response.status(status).json({ error: message });
  });
  return app;
}