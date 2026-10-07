import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { forbidden } from '../lib/errors.js';
import { getAppUserFromSupabaseToken, isSupabaseConfigured } from '../lib/supabase.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token && isSupabaseConfigured) {
      const user = await getAppUserFromSupabaseToken(token);
      if (user?.active) {
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
        return next();
      }
    }

    if (config.DEV_AUTH_BYPASS && config.NODE_ENV !== 'production') {
      const devUser = await prisma.user.findUnique({ where: { email: config.DEV_AUTH_BYPASS_EMAIL.toLowerCase() } });
      if (!devUser || !devUser.active) return next(forbidden(`Local dev bypass user not found or inactive: ${config.DEV_AUTH_BYPASS_EMAIL}`));
      req.user = { id: devUser.id, email: devUser.email, role: devUser.role, name: devUser.name };
      return next();
    }

    if (!token) return next(forbidden('Authentication required'));

    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return next(forbidden('Account is inactive or no longer exists'));

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch {
    next(forbidden('Invalid or expired authentication token'));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(forbidden('Authentication required'));
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const canManageInventory = requireRoles('ADMIN', 'MANAGER');
export const adminOnly = requireRoles('ADMIN');
