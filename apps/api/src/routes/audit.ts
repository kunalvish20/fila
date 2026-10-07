import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { adminOnly, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/pagination.js';

export const auditRouter = Router();
auditRouter.use(authenticate, adminOnly);

auditRouter.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ include: { actor: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.auditLog.count()
  ]);
  res.json({ items, total, page, limit });
}));
