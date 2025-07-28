import { Request, Response, NextFunction } from 'express';
import { IAdminUser } from '../models/AdminUser';

// Define user roles and their permissions
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator', 
  VIEWER = 'viewer'
}

export enum Permission {
  // Schema management
  CREATE_SCHEMA = 'create_schema',
  UPDATE_SCHEMA = 'update_schema',
  DELETE_SCHEMA = 'delete_schema',
  VIEW_SCHEMA = 'view_schema',
  
  // Registration management
  VIEW_REGISTRATIONS = 'view_registrations',
  APPROVE_REGISTRATIONS = 'approve_registrations',
  REJECT_REGISTRATIONS = 'reject_registrations',
  
  // Credential management
  ISSUE_CREDENTIALS = 'issue_credentials',
  REVOKE_CREDENTIALS = 'revoke_credentials',
  VIEW_CREDENTIALS = 'view_credentials',
  
  // Connection management
  VIEW_CONNECTIONS = 'view_connections',
  MANAGE_CONNECTIONS = 'manage_connections',
  
  // Transaction monitoring
  VIEW_TRANSACTIONS = 'view_transactions',
  
  // System administration
  MANAGE_USERS = 'manage_users',
  VIEW_SYSTEM_STATS = 'view_system_stats'
}

// Role-permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.CREATE_SCHEMA,
    Permission.UPDATE_SCHEMA,
    Permission.DELETE_SCHEMA,
    Permission.VIEW_SCHEMA,
    Permission.VIEW_REGISTRATIONS,
    Permission.APPROVE_REGISTRATIONS,
    Permission.REJECT_REGISTRATIONS,
    Permission.ISSUE_CREDENTIALS,
    Permission.REVOKE_CREDENTIALS,
    Permission.VIEW_CREDENTIALS,
    Permission.VIEW_CONNECTIONS,
    Permission.MANAGE_CONNECTIONS,
    Permission.VIEW_TRANSACTIONS,
    Permission.MANAGE_USERS,
    Permission.VIEW_SYSTEM_STATS
  ],
  [UserRole.OPERATOR]: [
    // Can manage schemas, registrations, and credentials but not users
    Permission.CREATE_SCHEMA,
    Permission.UPDATE_SCHEMA,
    Permission.VIEW_SCHEMA,
    Permission.VIEW_REGISTRATIONS,
    Permission.APPROVE_REGISTRATIONS,
    Permission.REJECT_REGISTRATIONS,
    Permission.ISSUE_CREDENTIALS,
    Permission.REVOKE_CREDENTIALS,
    Permission.VIEW_CREDENTIALS,
    Permission.VIEW_CONNECTIONS,
    Permission.MANAGE_CONNECTIONS,
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_SYSTEM_STATS
  ],
  [UserRole.VIEWER]: [
    // Read-only access
    Permission.VIEW_SCHEMA,
    Permission.VIEW_REGISTRATIONS,
    Permission.VIEW_CREDENTIALS,
    Permission.VIEW_CONNECTIONS,
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_SYSTEM_STATS
  ]
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: IAdminUser, permission: Permission): boolean {
  // For now, we'll use a simple role-based approach
  // In the future, this could be extended to support more granular permissions
  const userRole = (user as any).role || UserRole.OPERATOR; // Default to operator if no role set
  const rolePermissions = ROLE_PERMISSIONS[userRole as UserRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: {
          required_permission: permission,
          user_role: (req.user as any).role || 'operator'
        }
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has any of the required permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user!, permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: {
          required_permissions: permissions,
          user_role: (req.user as any).role || 'operator'
        }
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has a specific role
 */
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = (req.user as any).role || UserRole.OPERATOR;
    if (userRole !== role) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' required`,
        code: 'INSUFFICIENT_ROLE',
        details: {
          required_role: role,
          user_role: userRole
        }
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = requireRole(UserRole.ADMIN);