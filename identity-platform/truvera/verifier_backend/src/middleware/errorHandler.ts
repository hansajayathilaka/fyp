import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TruveraApiError extends Error {
  statusCode = 502;
  code = 'TRUVERA_API_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'TruveraApiError';
  }
}

export class ConfigurationError extends Error {
  statusCode = 500;
  code = 'CONFIGURATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details
  console.error('API Error:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Determine error code
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  // Create error response
  const errorResponse: any = {
    error: {
      code: errorCode,
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = err.details;
    errorResponse.error.stack = err.stack;
  }

  // Add request context for debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
    };
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Request validation middleware
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Basic validation - can be enhanced with a validation library like Joi or Zod
      if (schema.body && !req.body) {
        throw new ValidationError('Request body is required');
      }
      
      if (schema.requiredFields) {
        for (const field of schema.requiredFields) {
          if (!req.body[field]) {
            throw new ValidationError(`Field '${field}' is required`);
          }
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}