import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      // Admin has all permissions
      if (req.user.role === 'ADMIN') {
        return next();
      }
      
      // Check user's role permissions
      const userWithRoles = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      
      if (!userWithRoles) {
        return res.status(403).json({ error: 'User not found' });
      }
      
      // Check if user has the required permission
      const hasPermission = userWithRoles.userRoles.some((userRole) => {
        // Check if role has expired
        if (userRole.expiresAt && userRole.expiresAt < new Date()) {
          return false;
        }
        
        return userRole.role.permissions.some(
          (rp) => rp.permission.resource === resource && rp.permission.action === action
        );
      });
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Insufficient permissions. Required: ${resource}:${action}` 
        });
      }
      
      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
};

