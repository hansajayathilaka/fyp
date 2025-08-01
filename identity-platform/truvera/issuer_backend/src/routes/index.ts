import { Router } from 'express';
import sessionRoutes from './session';
import walletRoutes from './wallet';
import credentialRoutes from './credentials';
import healthRoutes from './health';

const router = Router();

// Mount route modules
router.use('/session', sessionRoutes);
router.use('/wallet', walletRoutes);
router.use('/credentials', credentialRoutes);
router.use('/health', healthRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'SSI Issuing Platform API',
      version: '1.0.0',
      endpoints: {
        session: '/api/session',
        wallet: '/api/wallet',
        credentials: '/api/credentials',
        health: '/api/health',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;