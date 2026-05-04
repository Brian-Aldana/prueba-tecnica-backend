import { Router } from 'express';
import axios from 'axios';

const router = Router();

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

router.get('/api/v1/health', async (_req, res) => {
  const check = async (url: string) => {
    try {
      const { data } = await axios.get(url, { timeout: 3000 });
      return data;
    } catch {
      return { status: 'error', service: url };
    }
  };

  const [payment, notification] = await Promise.all([
    check(`${PAYMENT_SERVICE_URL}/api/health`),
    check(`${NOTIFICATION_SERVICE_URL}/api/health`),
  ]);

  const allOk = payment.status === 'ok' && notification.status === 'ok';

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    service: 'api-gateway',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: { payment, notification },
  });
});

export { router as healthRouter };
