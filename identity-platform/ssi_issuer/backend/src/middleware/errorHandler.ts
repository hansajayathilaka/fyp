import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../types/api';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.message.includes('unauthorized')) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError' || err.message.includes('forbidden')) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (err.message.includes('KERIA') || err.message.includes('signify')) {
    statusCode = 500;
    errorCode = 'KERIA_ERROR';
  } else if (err.message.includes('database') || err.message.includes('MongoDB') || err.message.includes('mongoose')) {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
  }

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: ApiError = {
    error: errorCode,
    message: message,
    code: errorCode,
    ...(isDevelopment && err.details && { details: err.details }),
    ...(isDevelopment && err.stack && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
};