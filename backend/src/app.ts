import cors from 'cors';
import express from 'express';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { tournamentRoutes } from './routes/tournament.routes';
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';
import { authenticate } from './middleware/auth';

export const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigin === '*') {
        return callback(null, true);
      }
      const allowed = config.corsOrigin.split(',').map((o) => o.trim());
      if (allowed.includes(origin) || allowed.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '10mb' }));

app.get(['/health', '/api/health'], (_request, response) => {
  response.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/admin', usersRoutes);
app.use('/admin', usersRoutes);

app.use('/api', authenticate, tournamentRoutes);
app.use('/', authenticate, tournamentRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'La ruta solicitada no existe.' } });
});

app.use(errorHandler);
