import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminUser, IAdminUser } from '../models/AdminUser';
import { config } from '../config';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IAdminUser;
    }
  }
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
    
    // Fetch user from database to ensure they still exist and are active
    const user = await AdminUser.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token - user not found',
        code: 'INVALID_TOKEN'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

export const generateToken = (user: IAdminUser): string => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user._id.toString(),
    username: user.username,
    email: user.email
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.sessionTimeout || '24h'
  });
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Generate new token
    const newToken = generateToken(req.user);
    
    // Update last login
    await req.user.updateLastLogin();

    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          lastLogin: req.user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};