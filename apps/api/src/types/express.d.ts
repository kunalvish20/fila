import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      email: string;
      role: UserRole;
      name: string;
    }
    interface Request {
      user?: UserContext;
    }
  }
}

export {};
