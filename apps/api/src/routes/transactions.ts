import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/pagination.js';

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

transactionsRouter.get('/', requireRoles('ADMIN', 'MANAGER', 'EMPLOYEE'), asyncHandler(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const base: Prisma.InventoryTransactionWhereInput = {
    ...(req.user!.role === 'EMPLOYEE' ? { employeeId: req.user!.id } : {}),
    ...(search ? { OR: [
      { reason: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { filament: { filamentId: { contains: search, mode: 'insensitive' } } },
      { employee: { name: { contains: search, mode: 'insensitive' } } }
    ] } : {})
  };
  const [items, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({ where: base, include: { filament: true, actor: { select: { id: true, name: true } }, employee: { select: { id: true, name: true } }, request: true, usageRecord: true }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.inventoryTransaction.count({ where: base })
  ]);
  res.json({ items, total, page, limit });
}));
