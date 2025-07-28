import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AdminUser } from '../models/AdminUser';
import { generateToken, authenticateToken, refreshToken } from '../middleware/auth';
import { requirePermission, Permission, requireAdmin } from '../middleware/authorization';
import { createSession, removeSession, getUserSessions, getSessionStats } from '../middleware/session';
import { getSecurityStats } from '../middleware/security';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting for login attempts (simple in-memory store)
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const checkRateLimit = (identifier: string): boolean => {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return true;

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    if (timeSinceLastAttempt < LOCKOUT_TIME) {
      return false;
    } else {
      // Reset attempts after lockout period
      loginAttempts.delete(identifier);
      return true;
    }
  }
  return true;
};

const recordLoginAttempt = (identifier: string, success: boolean) => {
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }

  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
  attempts.count += 1;
  attempts.lastAttempt = new Date();
  loginAttempts.set(identifier, attempts);
};

// POST /api/admin/login
router.post('/login', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Check rate limiting
    if (!checkRateLimit(clientIP)) {
      logger.warn(`Login rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Find user by username
    const user = await AdminUser.findByUsername(username);
    if (!user) {
      recordLoginAttempt(clientIP, false);
      logger.warn(`Login attempt with invalid username: ${username} from IP: ${clientIP}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      recordLoginAttempt(clientIP, false);
      logger.warn(`Invalid password attempt for user: ${username} from IP: ${clientIP}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Successful login
    recordLoginAttempt(clientIP, true);
    
    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`Successful login for user: ${username} from IP: ${clientIP}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// POST /api/admin/logout
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // In a more sophisticated implementation, you might maintain a blacklist of tokens
    // For now, we'll just return success and let the client handle token removal
    
    logger.info(`User logged out: ${req.user?.username}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// POST /api/admin/refresh-token
router.post('/refresh-token', authenticateToken, refreshToken);

// GET /api/admin/profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          lastLogin: req.user.lastLogin,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// PUT /api/admin/change-password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await req.user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    req.user.passwordHash = newPassword; // Will be hashed by pre-save middleware
    await req.user.save();

    logger.info(`Password changed for user: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

export { router as adminRoutes };