import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders, securityLogger, sanitizeInput, corsSecurityCheck, createRateLimit } from './middleware/security';
import { validateSession, checkTokenRefresh } from './middleware/session';
import { logger } from './utils/logger';
import { dbManager } from './database/connection';
import { DatabaseSeeder } from './database/init';
import { keriaClient } from './services/KeriaClient';
import { credentialService } from './services/CredentialService';
import { registryService } from './services/RegistryService';
import { schemaRoutes } from './routes/schemas';
import { registryRoutes } from './routes/registries';
import { registrationRoutes } from './routes/registration';
import { oobiRoutes } from './routes/oobi';
import { adminRoutes } from './routes/admin';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Custom security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Additional CORS security check
app.use(corsSecurityCheck);

// Rate limiting for admin login
app.use('/api/admin/login', createRateLimit('login'));

// General rate limiting for API endpoints
app.use('/api', createRateLimit('api'));

// Rate limiting for registration
app.use('/api/register', createRateLimit('registration'));

// Session validation and token refresh check
app.use(validateSession);
app.use(checkTokenRefresh);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Security logging
app.use(securityLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = dbManager.healthCheck();
    const keriaHealth = await keriaClient.healthCheck();
    const keriaStatus = await credentialService.getKeriaStatus();
    const registryHealth = await registryService.healthCheck();
    
    const overallStatus = dbHealth.status === 'healthy' && keriaHealth.status === 'healthy' && registryHealth.status === 'healthy' ? 'ok' : 'error';
    
    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'ssi-issuer-api',
      database: dbHealth,
      keria: keriaHealth,
      registry: registryHealth,
      services: keriaStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'ssi-issuer-api',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api', schemaRoutes);
app.use('/api', registryRoutes);
app.use('/api', registrationRoutes);
app.use('/oobis', oobiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'SSI Issuer API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      status: '/api/status',
      schemas: {
        admin: '/api/admin/schemas',
        public: '/api/schemas/public'
      },
      registries: {
        admin: '/api/admin/registries',
        stats: '/api/admin/registries/stats'
      },
      registration: {
        register: '/api/register',
        connectionQr: '/api/connection/qr',
        connectionStatus: '/api/connection/status/:registrationId',
        invitationQr: '/api/connection/invitation/:id/qr',
        admin: {
          list: '/api/admin/registrations',
          get: '/api/admin/registrations/:id',
          approve: '/api/admin/registrations/:id/approve',
          reject: '/api/admin/registrations/:id/reject',
          stats: '/api/admin/registrations/stats'
        }
      },
      oobi: {
        resolve: '/oobis/resolve',
        contacts: '/oobis/contacts',
        invitationAccept: '/api/connection/invitation/:id/accept',
        admin: {
          stats: '/api/admin/oobi/stats',
          cleanup: '/api/admin/oobi/cleanup'
        }
      }
    }
  });
});

// Status endpoint for detailed system information
app.get('/api/status', async (req, res) => {
  try {
    const keriaStatus = await credentialService.getKeriaStatus();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        keria: keriaStatus,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'KERIA_STATUS_ERROR'
      }
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await dbManager.initialize();
    
    // Seed default data
    await DatabaseSeeder.seedDefaultData();
    
    // Initialize KERIA client
    await keriaClient.initialize();
    
    // Initialize credential service
    await credentialService.initialize();
    
    // Initialize registry service
    await registryService.initialize();
    
    // In development, create sample data
    if (process.env.NODE_ENV === 'development') {
      await DatabaseSeeder.createSampleData();
    }
    
    // Start server
    const PORT = config.server.port;
    const HOST = config.server.host;

    app.listen(PORT, HOST, () => {
      logger.info(`SSI Issuer API server started on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${config.database.uri}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();