import express from 'express';
import { loggingMiddleware } from './middleware/logging.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import { proxyMiddleware } from './proxy/proxy.middleware';
import { healthRouter } from './proxy/health.router';

const app = express();

app.use(express.json());
app.use(loggingMiddleware);

app.use(healthRouter);

app.use('/api/v1', rateLimitMiddleware, authMiddleware, proxyMiddleware);

app.use((_req, res) => {
  res.status(404).json({ statusCode: 404, message: 'Ruta no encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ statusCode: 500, message: 'Error interno del servidor' });
});

export { app };
