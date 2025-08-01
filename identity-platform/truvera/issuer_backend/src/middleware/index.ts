import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

// Enhanced logging utility
export const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  warn: (message: string, meta?: unknown) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

// Request logging middleware
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.session?.id
  });
  next();
};

// Input validation middleware
export const validateJsonContent = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CONTENT_TYPE',
        message: 'Content-Type must be application/json',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
    return;
  }
  next();
};



// Rate limiting middleware (simple implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      logger.warn('Rate limit exceeded', { clientId, count: clientData.count });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }
    
    clientData.count++;
    next();
  };
};

// Error response helper
export const createErrorResponse = (
  code: string,
  message: string,
  details?: unknown
): ApiResponse => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
  timestamp: new Date().toISOString(),
});

// Success response helper
export const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// Global error handler
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    sessionId: req.session?.id
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json(createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    isDevelopment ? err.message : 'An internal server error occurred',
    isDevelopment ? err.stack : undefined
  ));
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('404 - Route not found:', req.originalUrl);
  res.status(404).json(createErrorResponse(
    'NOT_FOUND',
    'Endpoint not found'
  ));
};