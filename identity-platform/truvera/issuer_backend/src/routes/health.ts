import { Router, Request, Response } from 'express';
import { performHealthCheck } from '../config';
import { createSuccessResponse, createErrorResponse } from '../middleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Basic health check endpoint
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.json(createSuccessResponse({
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
}));

/**
 * Comprehensive health check with external service validation
 */
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  const healthCheck = await performHealthCheck();
  
  // Set appropriate HTTP status based on health check result
  let statusCode = 200;
  if (healthCheck.status === 'unhealthy') {
    statusCode = 503; // Service Unavailable
  } else if (healthCheck.status === 'degraded') {
    statusCode = 200; // OK but with warnings
  }
  
  res.status(statusCode).json(createSuccessResponse(healthCheck));
}));

/**
 * Readiness probe for container orchestration
 */
router.get('/ready', asyncHandler(async (_req: Request, res: Response) => {
  const healthCheck = await performHealthCheck();
  
  // Check if critical services are available
  const criticalChecks = ['environment', 'configuration'];
  const criticalFailures = criticalChecks.filter(
    checkName => healthCheck.checks[checkName]?.status === 'fail'
  );
  
  if (criticalFailures.length > 0) {
    return res.status(503).json(createErrorResponse(
      'SERVICE_NOT_READY',
      'Service is not ready to handle requests',
      {
        failedChecks: criticalFailures,
        checks: healthCheck.checks
      }
    ));
  }
  
  res.json(createSuccessResponse({
    status: 'ready',
    message: 'Service is ready to handle requests',
    timestamp: healthCheck.timestamp
  }));
}));

/**
 * Liveness probe for container orchestration
 */
router.get('/live', asyncHandler(async (_req: Request, res: Response) => {
  // Basic liveness check - just verify the process is running
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Check for memory leaks or other critical issues
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memLimitMB = 1024; // Critical threshold
  
  if (memUsageMB > memLimitMB) {
    return res.status(503).json(createErrorResponse(
      'MEMORY_LIMIT_EXCEEDED',
      'Service is consuming too much memory',
      {
        memoryUsage: memUsageMB,
        memoryLimit: memLimitMB,
        uptime
      }
    ));
  }
  
  res.json(createSuccessResponse({
    status: 'alive',
    uptime,
    memoryUsage: memUsageMB,
    timestamp: new Date().toISOString()
  }));
}));

/**
 * Configuration validation endpoint (for debugging)
 */
router.get('/config', asyncHandler(async (_req: Request, res: Response) => {
  // Only allow in development or with special header
  if (process.env.NODE_ENV === 'production' && !_req.headers['x-debug-token']) {
    return res.status(403).json(createErrorResponse(
      'ACCESS_DENIED',
      'Configuration endpoint not available in production'
    ));
  }
  
  const healthCheck = await performHealthCheck();
  
  // Return sanitized configuration information
  const configInfo = {
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    truveraApiUrl: process.env.TRUVERA_API_URL,
    truveraApiKeySet: !!process.env.TRUVERA_API_KEY,
    issuerDidSet: !!process.env.ISSUER_DID,
    sessionSecretSet: !!process.env.SESSION_SECRET,
    corsOrigins: process.env.CORS_ORIGINS,
    logLevel: process.env.LOG_LEVEL,
    environmentCheck: healthCheck.checks.environment,
    configurationCheck: healthCheck.checks.configuration
  };
  
  res.json(createSuccessResponse({
    configuration: configInfo,
    validation: {
      status: healthCheck.status,
      timestamp: healthCheck.timestamp
    }
  }));
}));

export default router;