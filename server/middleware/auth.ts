import { Request, Response, NextFunction } from 'express';
import { db } from '../db/mongodb.js';
import { verifyJWT } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[JWT] ❌ No bearer token in request to ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const payload = verifyJWT(token);
      console.log(`[JWT] ✅ Auth success: ${payload.username} (${payload.userId.substring(0, 8)}...)`);
      const user = await db.getUserById(payload.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check account access through roles
      const hasAccess = await db.hasPermission(payload.userId, 'account_access');
      if (!hasAccess) {
        return res.status(403).json({ error: 'Account access denied' });
      }

      req.userId = payload.userId;
      req.user = user;
      next();
    } catch (jwtError) {
      console.log(`[JWT] ❌ Token verification failed:`, (jwtError as Error).message);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await db.hasPermission(req.userId, permissionName);
      if (!hasPermission) {
        return res.status(403).json({ error: `Permission '${permissionName}' required` });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ error: 'Permission check error' });
    }
  };
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check for admin panel access permission
    const hasAdminAccess = await db.hasPermission(req.userId, 'admin_panel_access');
    
    if (!hasAdminAccess) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Admin check error' });
  }
};