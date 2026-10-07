import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function audit(req: Request, params: {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.id,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      before: params.before ?? undefined,
      after: params.after ?? undefined,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });
}
