import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { 
  logger, 
  requestLogger, 
  validateJsonContent, 
  rateLimit, 
  createSuccessResponse
} from './middleware';
import { 
  errorHandler, 
  notFoundHandler 
} from './middleware/errorHandler';
import { config, validateConfig } from './config';

logger.info(`Starting server in ${config.nodeEnv} mode`);

// Validate configuration
if (!validateConfig()) {
  process.exit(1);
}

const app = express();

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimit(config.security.rateLimitMax, config.security.rateLimitWindowMs));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", config.truvera.apiUrl],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin matches any allowed origins (strings or regex patterns)
      const isAllowed = config.security.corsOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request from origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration with enhanced security
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'ssi.session.id',
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      maxAge: config.sessionMaxAge,
      sameSite: config.isProduction ? 'strict' : 'lax',
    },
    rolling: true, // Reset expiration on activity
  })
);

// Request validation middleware
app.use(validateJsonContent);

// Basic health check endpoint (for load balancers)
app.get('/health', (_req, res) => {
  res.json(createSuccessResponse({
    status: 'OK',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
});

// API routes
import apiRoutes from './routes';
app.use('/api', apiRoutes);

// 404 handler (must come before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Perform startup validation and health checks
async function startServer() {
  try {
    logger.info('🚀 Starting SSI Issuing Platform...');
    
    // Import health check function
    const { performHealthCheck } = await import('./config');
    
    // Perform comprehensive startup health check
    logger.info('🔍 Performing startup health checks...');
    const healthCheck = await performHealthCheck();
    
    if (healthCheck.status === 'unhealthy') {
      logger.error('❌ Startup health check failed:', healthCheck.checks);
      
      // Log specific failures
      Object.entries(healthCheck.checks).forEach(([checkName, check]) => {
        if (check.status === 'fail') {
          logger.error(`  - ${checkName}: ${check.message}`);
        }
      });
      
      logger.error('❌ Cannot start server due to health check failures');
      logger.info('ℹ️  Note: Truvera API connectivity will be validated during actual usage');
      process.exit(1);
    }
    
    if (healthCheck.status === 'degraded') {
      logger.warn('⚠️  Server starting with warnings:', healthCheck.checks);
      
      // Log warnings
      Object.entries(healthCheck.checks).forEach(([checkName, check]) => {
        if (check.status === 'warn') {
          logger.warn(`  - ${checkName}: ${check.message}`);
        }
      });
    }
    
    // Start the server
    app.listen(config.port, '0.0.0.0', () => {
      logger.info('✅ Server started successfully', {
        port: config.port,
        host: '0.0.0.0',
        environment: config.nodeEnv,
        healthStatus: healthCheck.status,
        truveraApiUrl: config.truvera.apiUrl,
        sessionMaxAge: config.sessionMaxAge,
        rateLimitMax: config.security.rateLimitMax,
        rateLimitWindowMs: config.security.rateLimitWindowMs,
        corsOrigins: config.security.corsOrigins.length,
      });
      
      // Log successful health checks
      const passedChecks = Object.entries(healthCheck.checks)
        .filter(([, check]) => check.status === 'pass')
        .map(([name]) => name);
      
      if (passedChecks.length > 0) {
        logger.info('✅ Health checks passed:', passedChecks.join(', '));
      }
      
      // Schedule periodic health checks in production
      if (config.isProduction) {
        setInterval(async () => {
          try {
            const periodicCheck = await performHealthCheck();
            if (periodicCheck.status === 'unhealthy') {
              logger.error('🚨 Periodic health check failed:', periodicCheck.checks);
            }
          } catch (error) {
            logger.error('Failed to perform periodic health check:', error);
          }
        }, 5 * 60 * 1000); // Every 5 minutes
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app, logger };
