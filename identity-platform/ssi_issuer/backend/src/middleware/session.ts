import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { JWTPayload } from './auth';

// Session management configuration
const SESSION_CONFIG = {
  // Token refresh threshold (refresh if token expires within this time)
  REFRESH_THRESHOLD: 15 * 60 * 1000, // 15 minutes
  
  // Maximum session duration (absolute timeout)
  MAX_SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours
  
  // Inactivity timeout
  INACTIVITY_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours
};

// In-memory session store (in production, use Redis or similar)
interface SessionData {
  userId: string;
  username: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

const activeSessions = new Map<string, SessionData>();

/**
 * Extract session ID from JWT token
 */
function getSessionId(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded ? `${decoded.userId}_${decoded.iat}` : null;
  } catch {
    return null;
  }
}

/**
 * Create session data
 */
export function createSession(userId: string, username: string, req: Request): string {
  const sessionId = `${userId}_${Date.now()}`;
  const sessionData: SessionData = {
    userId,
    username,
    loginTime: new Date(),
    lastActivity: new Date(),
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown'
  };
  
  activeSessions.set(sessionId, sessionData);
  
  logger.info(`Session created for user: ${username}, session: ${sessionId}`);
  return sessionId;
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
    activeSessions.set(sessionId, session);
  }
}

/**
 * Remove session
 */
export function removeSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    activeSessions.delete(sessionId);
    logger.info(`Session removed for user: ${session.username}, session: ${sessionId}`);
  }
}

/**
 * Check if session is valid
 */
export function isSessionValid(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }

  const now = new Date();
  const sessionAge = now.getTime() - session.loginTime.getTime();
  const inactivityTime = now.getTime() - session.lastActivity.getTime();

  // Check maximum session duration
  if (sessionAge > SESSION_CONFIG.MAX_SESSION_DURATION) {
    removeSession(sessionId);
    return false;
  }

  // Check inactivity timeout
  if (inactivityTime > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
    removeSession(sessionId);
    return false;
  }

  return true;
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: string): SessionData[] {
  const userSessions: SessionData[] = [];
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId && isSessionValid(sessionId)) {
      userSessions.push(session);
    }
  }
  
  return userSessions;
}

/**
 * Remove all sessions for a user
 */
export function removeUserSessions(userId: string): void {
  const sessionsToRemove: string[] = [];
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      sessionsToRemove.push(sessionId);
    }
  }
  
  sessionsToRemove.forEach(sessionId => removeSession(sessionId));
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): void {
  const expiredSessions: string[] = [];
  
  for (const [sessionId] of activeSessions.entries()) {
    if (!isSessionValid(sessionId)) {
      expiredSessions.push(sessionId);
    }
  }
  
  expiredSessions.forEach(sessionId => removeSession(sessionId));
  
  if (expiredSessions.length > 0) {
    logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
  }
}

/**
 * Middleware to validate session
 */
export function validateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Let auth middleware handle missing token
    }

    const sessionId = getSessionId(token);
    if (!sessionId) {
      return next(); // Let auth middleware handle invalid token
    }

    // Check if session is valid
    if (!isSessionValid(sessionId)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session expired or invalid',
        code: 'SESSION_EXPIRED'
      });
    }

    // Update session activity
    updateSessionActivity(sessionId);

    // Add session info to request
    (req as any).sessionId = sessionId;
    (req as any).sessionData = activeSessions.get(sessionId);

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    next(); // Let auth middleware handle the error
  }
}

/**
 * Middleware to check if token needs refresh
 */
export function checkTokenRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    // If token expires within refresh threshold, add refresh header
    if (timeUntilExpiry * 1000 < SESSION_CONFIG.REFRESH_THRESHOLD) {
      res.set('X-Token-Refresh-Needed', 'true');
    }

    next();
  } catch (error) {
    // Token is invalid, let auth middleware handle it
    next();
  }
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  const now = new Date();
  let activeSessions = 0;
  let expiredSessions = 0;
  const userCounts = new Map<string, number>();

  for (const [sessionId, session] of activeSessions.entries()) {
    if (isSessionValid(sessionId)) {
      activeSessions++;
      const count = userCounts.get(session.userId) || 0;
      userCounts.set(session.userId, count + 1);
    } else {
      expiredSessions++;
    }
  }

  return {
    totalActiveSessions: activeSessions,
    expiredSessions,
    uniqueUsers: userCounts.size,
    averageSessionsPerUser: activeSessions / Math.max(userCounts.size, 1),
    timestamp: now
  };
}

// Cleanup expired sessions every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);