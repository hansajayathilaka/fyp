import { logger } from '../utils/logger';
import { AdminUser, IAdminUser } from '../models/AdminUser';

interface SessionInfo {
  userId: string;
  username: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

interface TokenBlacklistEntry {
  token: string;
  expiresAt: Date;
  reason: string;
}

export class SessionService {
  private static activeSessions = new Map<string, SessionInfo>();
  private static blacklistedTokens = new Map<string, TokenBlacklistEntry>();

  // Track active session
  public static trackSession(userId: string, username: string, ipAddress: string, userAgent: string): void {
    const sessionInfo: SessionInfo = {
      userId,
      username,
      loginTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent
    };

    this.activeSessions.set(userId, sessionInfo);
    
    logger.info('Session tracked', {
      userId,
      username,
      ipAddress,
      userAgent
    });
  }

  // Update session activity
  public static updateActivity(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  // Remove session
  public static removeSession(userId: string, reason: string = 'logout'): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      logger.info('Session removed', {
        userId,
        username: session.username,
        reason,
        duration: Date.now() - session.loginTime.getTime()
      });
      
      this.activeSessions.delete(userId);
    }
  }

  // Get active sessions
  public static getActiveSessions(): SessionInfo[] {
    return Array.from(this.activeSessions.values());
  }

  // Get session by user ID
  public static getSession(userId: string): SessionInfo | undefined {
    return this.activeSessions.get(userId);
  }

  // Blacklist token
  public static blacklistToken(token: string, expiresAt: Date, reason: string = 'logout'): void {
    this.blacklistedTokens.set(token, {
      token,
      expiresAt,
      reason
    });

    logger.info('Token blacklisted', {
      reason,
      expiresAt
    });
  }

  // Check if token is blacklisted
  public static isTokenBlacklisted(token: string): boolean {
    const entry = this.blacklistedTokens.get(token);
    if (!entry) {
      return false;
    }

    // Check if token has expired
    if (new Date() > entry.expiresAt) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  // Clean up expired tokens and inactive sessions
  public static cleanup(): void {
    const now = new Date();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up expired blacklisted tokens
    for (const [token, entry] of this.blacklistedTokens.entries()) {
      if (now > entry.expiresAt) {
        this.blacklistedTokens.delete(token);
      }
    }

    // Clean up inactive sessions
    for (const [userId, session] of this.activeSessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceActivity > sessionTimeout) {
        logger.info('Session expired due to inactivity', {
          userId,
          username: session.username,
          lastActivity: session.lastActivity,
          inactiveFor: `${Math.round(timeSinceActivity / 1000 / 60)} minutes`
        });
        
        this.activeSessions.delete(userId);
      }
    }

    logger.debug('Session cleanup completed', {
      activeSessions: this.activeSessions.size,
      blacklistedTokens: this.blacklistedTokens.size
    });
  }

  // Force logout user (admin function)
  public static async forceLogout(userId: string, reason: string = 'admin_action'): Promise<void> {
    const session = this.getSession(userId);
    if (session) {
      this.removeSession(userId, reason);
      
      // Update user's last login to force token refresh
      const user = await AdminUser.findById(userId);
      if (user) {
        user.lastLogin = new Date(0); // Set to epoch to invalidate all tokens
        await user.save();
      }

      logger.warn('User force logged out', {
        userId,
        username: session.username,
        reason
      });
    }
  }

  // Get session statistics
  public static getSessionStats(): {
    totalActiveSessions: number;
    blacklistedTokens: number;
    oldestSession?: Date;
    newestSession?: Date;
  } {
    const sessions = Array.from(this.activeSessions.values());
    
    return {
      totalActiveSessions: sessions.length,
      blacklistedTokens: this.blacklistedTokens.size,
      oldestSession: sessions.length > 0 ? 
        new Date(Math.min(...sessions.map(s => s.loginTime.getTime()))) : undefined,
      newestSession: sessions.length > 0 ? 
        new Date(Math.max(...sessions.map(s => s.loginTime.getTime()))) : undefined
    };
  }

  // Initialize cleanup interval
  public static startCleanupInterval(intervalMs: number = 60 * 60 * 1000): void { // 1 hour
    setInterval(() => {
      this.cleanup();
    }, intervalMs);

    logger.info('Session cleanup interval started', {
      intervalMinutes: intervalMs / 1000 / 60
    });
  }
}