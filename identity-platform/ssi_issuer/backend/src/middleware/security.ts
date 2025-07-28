import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Different rate limits for different endpoints
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later'
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 API requests per 15 minutes
    message: 'Too many requests, please try again later',
    skipSuccessfulRequests: true
  },
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 registration attempts per hour
    message: 'Too many registration attempts, please try again later'
  }
};

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Create rate limiting middleware
 */
export function createRateLimit(limitType: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[limitType];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${limitType}:${identifier}`;
    const now = Date.now();
    
    // Clean up expired entries
    for (const [storeKey, data] of rateLimitStore.entries()) {
      if (data.resetTime <= now) {
        rateLimitStore.delete(storeKey);
      }
    }
    
    // Get current count for this identifier
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || rateLimitData.resetTime <= now) {
      // Create new rate limit entry
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }
    
    // Check if limit exceeded
    if (rateLimitData.count >= config.maxRequests) {
      const resetTimeSeconds = Math.ceil((rateLimitData.resetTime - now) / 1000);
      
      logger.warn(`Rate limit exceeded for ${limitType} from ${identifier}`);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: config.message,
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          limit: config.maxRequests,
          windowMs: config.windowMs,
          resetTime: resetTimeSeconds
        }
      });
    }
    
    // Increment counter
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': (config.maxRequests - rateLimitData.count).toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000).toString()
    });
    
    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  res.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');
  
  // XSS Protection
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Request logging middleware with security context
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const method = req.method;
  const url = req.originalUrl;
  
  // Log request start
  logger.info(`${method} ${url}`, {
    ip: clientIP,
    userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log response
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${method} ${url} ${statusCode} ${duration}ms`, {
      ip: clientIP,
      userAgent,
      statusCode,
      duration,
      timestamp: new Date().toISOString()
    });
    
    // Log security events
    if (statusCode === 401) {
      logger.warn('Unauthorized access attempt', {
        ip: clientIP,
        userAgent,
        url,
        method
      });
    } else if (statusCode === 403) {
      logger.warn('Forbidden access attempt', {
        ip: clientIP,
        userAgent,
        url,
        method
      });
    } else if (statusCode === 429) {
      logger.warn('Rate limit exceeded', {
        ip: clientIP,
        userAgent,
        url,
        method
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Remove potentially dangerous characters
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key name
      const sanitizedKey = key.replace(/[<>\"'&]/g, '');
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * CORS security middleware (more restrictive than the basic CORS)
 */
export function corsSecurityCheck(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  
  // Log cross-origin requests for monitoring
  if (origin && origin !== req.get('Host')) {
    logger.info('Cross-origin request detected', {
      origin,
      referer,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl
    });
  }
  
  next();
}

/**
 * Get security statistics
 */
export function getSecurityStats() {
  const now = Date.now();
  const stats = {
    rateLimitEntries: rateLimitStore.size,
    activeRateLimits: 0,
    expiredRateLimits: 0,
    timestamp: new Date(now)
  };
  
  // Count active vs expired rate limit entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime > now) {
      stats.activeRateLimits++;
    } else {
      stats.expiredRateLimits++;
    }
  }
  
  return stats;
}

// Clean up expired rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired rate limit entries`);
  }
}, 10 * 60 * 1000);