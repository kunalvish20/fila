import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { adminOnly, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { routeParam } from '../utils/request.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get('/', adminOnly, asyncHandler(async (_req, res) => {
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  res.json(settings);
}));

settingsRouter.put('/:key', adminOnly, asyncHandler(async (req, res) => {
  const schema = z.object({ value: z.unknown() });
  const body = schema.parse(req.body);
  const key = routeParam(req.params.key, 'key');
  const setting = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: body.value as Prisma.InputJsonValue },
    update: { value: body.value as Prisma.InputJsonValue }
  });
  await audit(req, { action: 'UPSERT_SETTING', entity: 'SystemSetting', entityId: setting.key, after: setting as unknown as Prisma.InputJsonValue });
  res.json(setting);
}));
