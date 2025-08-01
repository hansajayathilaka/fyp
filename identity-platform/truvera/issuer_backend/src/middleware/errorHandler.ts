import { Request, Response, NextFunction } from 'express';
import { logger } from '.';


// Error types for better categorization
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// Custom error class with enhanced information
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.category = category;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', ErrorCategory.VALIDATION, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', ErrorCategory.AUTHENTICATION);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', ErrorCategory.AUTHORIZATION);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: unknown) {
    super(
      `External service error (${service}): ${message}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      ErrorCategory.EXTERNAL_SERVICE,
      true,
      { service, ...(details as Record<string, unknown>) }
    );
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', ErrorCategory.BUSINESS_LOGIC, true, details);
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: string;
    details?: unknown;
    troubleshooting?: string[];
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Generate user-friendly error messages
 */
function generateUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
    case 'MISSING_SESSION_ID':
      return 'Session ID is required. Please refresh the page and try again.';
    
    case 'SESSION_NOT_FOUND':
      return 'Your session has expired. Please refresh the page and start over.';
    
    case 'INVALID_FORM_DATA':
      return 'Please check your form data and correct any errors.';
    
    case 'WALLET_NOT_CONNECTED':
      return 'Wallet connection is required. Please connect your wallet and try again.';
    
    case 'CREDENTIAL_ISSUANCE_FAILED':
      return 'Failed to issue credential. Please try again or contact support.';
    
    case 'EXTERNAL_SERVICE_ERROR':
      return 'An external service is temporarily unavailable. Please try again in a few moments.';
    
    case 'VALIDATION_ERROR':
      return 'Please check your input data and correct any validation errors.';
    
    case 'AUTHENTICATION_ERROR':
      return 'Authentication failed. Please check your credentials and try again.';
    
    case 'AUTHORIZATION_ERROR':
      return 'You don\'t have permission to perform this action.';
    
    default:
      if (error.statusCode >= 500) {
        return 'We\'re experiencing technical difficulties. Our team has been notified.';
      }
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Generate troubleshooting steps based on error type
 */
function generateTroubleshootingSteps(error: AppError): string[] {
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return [
        'Check that all required fields are filled out correctly',
        'Verify data formats (email, phone numbers, etc.)',
        'Remove any special characters that might not be allowed',
        'Try submitting the form again'
      ];
    
    case ErrorCategory.AUTHENTICATION:
      return [
        'Refresh the page and try again',
        'Clear your browser cache and cookies',
        'Make sure you\'re using the correct credentials',
        'Contact support if the problem persists'
      ];
    
    case ErrorCategory.EXTERNAL_SERVICE:
      return [
        'Wait a few minutes and try again',
        'Check your internet connection',
        'Try again during off-peak hours',
        'Contact support if the service remains unavailable'
      ];
    
    case ErrorCategory.BUSINESS_LOGIC:
      return [
        'Review the operation you\'re trying to perform',
        'Make sure all prerequisites are met',
        'Check that your session hasn\'t expired',
        'Try the operation again from the beginning'
      ];
    
    default:
      return [
        'Refresh the page and try again',
        'Check your internet connection',
        'Clear your browser cache',
        'Contact support if the problem persists'
      ];
  }
}

/**
 * Log error with structured data and appropriate level
 */
function logError(error: AppError, req: Request, additionalContext?: Record<string, unknown>) {
  const logData = {
    error: {
      message: error.message,
      code: error.code,
      category: error.category,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details,
      timestamp: error.timestamp.toISOString()
    },
    request: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.get('user-agent'),
        'content-type': req.get('content-type'),
        'x-forwarded-for': req.get('x-forwarded-for'),
        'x-real-ip': req.get('x-real-ip')
      },
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query,
      sessionId: req.body?.sessionId || req.params?.sessionId || req.query?.sessionId
    },
    ...additionalContext
  };

  // Log with appropriate level based on error severity
  if (error.statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error occurred', logData);
  } else {
    logger.info('Handled error occurred', logData);
  }

  // Log critical errors separately for alerting
  if (error.statusCode >= 500 && error.isOperational) {
    logger.error('CRITICAL ERROR - Requires immediate attention', {
      ...logData,
      alert: true,
      severity: 'critical'
    });
  }
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert regular errors to AppError
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      appError = new ValidationError(error.message);
    } else if (error.name === 'CastError') {
      appError = new ValidationError('Invalid data format');
    } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
      appError = new AppError(
        'Database operation failed',
        500,
        'DATABASE_ERROR',
        ErrorCategory.DATABASE,
        true
      );
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      appError = new AppError(
        'Network connection failed',
        503,
        'NETWORK_ERROR',
        ErrorCategory.NETWORK,
        true
      );
    } else {
      // Unknown error - treat as internal server error
      appError = new AppError(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        500,
        'INTERNAL_ERROR',
        ErrorCategory.SYSTEM,
        false,
        process.env.NODE_ENV === 'development' ? { originalError: error.message, stack: error.stack } : undefined
      );
    }
  }

  // Log the error
  logError(appError, req);

  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(error);
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: appError.code,
      message: generateUserFriendlyMessage(appError),
      category: appError.category,
      details: process.env.NODE_ENV === 'development' ? appError.details : undefined,
      troubleshooting: generateTroubleshootingSteps(appError)
    },
    timestamp: appError.timestamp.toISOString(),
    requestId: req.headers['x-request-id'] as string
  };

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
}

/**
 * Handle 404 errors
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND',
    ErrorCategory.SYSTEM
  );
  
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  _statusCode: number = 400
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      category: ErrorCategory.UNKNOWN,
      details,
      troubleshooting: []
    },
    timestamp: new Date().toISOString()
  };
}

// Export error classes and utilities
export default AppError;