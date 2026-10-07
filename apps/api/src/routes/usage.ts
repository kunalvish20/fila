import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/pagination.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { roundKg } from '../utils/inventory.js';
import { audit } from '../utils/audit.js';
import { routeParam } from '../utils/request.js';

export const usageRouter = Router();
usageRouter.use(authenticate);

function usageWhere(user: Express.UserContext, base: Prisma.UsageRecordWhereInput = {}) {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return base;
  return { ...base, employeeId: user.id };
}

usageRouter.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const base: Prisma.UsageRecordWhereInput = {
    ...(search ? { OR: [
      { projectOrderId: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { employee: { name: { contains: search, mode: 'insensitive' } } },
      { filament: { filamentId: { contains: search, mode: 'insensitive' } } }
    ] } : {})
  };
  const where = usageWhere(req.user!, base);
  const [items, total] = await Promise.all([
    prisma.usageRecord.findMany({ where, include: { employee: { select: { id: true, name: true, email: true } }, filament: true, request: true }, orderBy: { usedAt: 'desc' }, skip, take: limit }),
    prisma.usageRecord.count({ where })
  ]);
  res.json({ items, total, page, limit });
}));

usageRouter.get('/balances', asyncHandler(async (req, res) => {
  const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : req.user!.id;
  if (req.user!.role === 'EMPLOYEE' && employeeId !== req.user!.id) throw forbidden('Employees can only view their own balances');
  const balances = await prisma.employeeFilamentBalance.findMany({
    where: { userId: employeeId, quantityKg: { gt: 0 } },
    include: { filament: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(balances);
}));

const usageSchema = z.object({
  employeeId: z.string().optional(),
  filamentId: z.string().min(1),
  requestId: z.string().optional(),
  projectOrderId: z.string().min(2),
  quantityUsedKg: z.coerce.number().positive(),
  usedAt: z.coerce.date().optional(),
  notes: z.string().optional()
});

usageRouter.post('/', requireRoles('ADMIN', 'MANAGER', 'EMPLOYEE'), asyncHandler(async (req, res) => {
  const body = usageSchema.parse(req.body);
  const employeeId = req.user!.role === 'EMPLOYEE' ? req.user!.id : (body.employeeId || req.user!.id);
  if (req.user!.role === 'EMPLOYEE' && body.employeeId && body.employeeId !== req.user!.id) throw forbidden('Employees can only record their own usage');

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.role !== 'EMPLOYEE' || !employee.active) throw badRequest('Select an active employee');

  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.employeeFilamentBalance.findUnique({ where: { userId_filamentId: { userId: employeeId, filamentId: body.filamentId } } });
    if (!balance) throw badRequest('Employee has no assigned balance for this filament');
    const previousBalance = Number(balance.quantityKg);
    if (body.quantityUsedKg > previousBalance) throw badRequest('Usage quantity exceeds employee assigned filament balance');
    const newBalance = roundKg(previousBalance - body.quantityUsedKg);
    await tx.employeeFilamentBalance.update({ where: { id: balance.id }, data: { quantityKg: newBalance } });
    const usage = await tx.usageRecord.create({
      data: {
        employeeId,
        filamentId: body.filamentId,
        requestId: body.requestId,
        projectOrderId: body.projectOrderId,
        quantityUsedKg: roundKg(body.quantityUsedKg),
        remainingQuantityKg: newBalance,
        usedAt: body.usedAt ?? new Date(),
        notes: body.notes
      },
      include: { employee: { select: { id: true, name: true, email: true } }, filament: true, request: true }
    });
    await tx.inventoryTransaction.create({
      data: {
        type: 'USAGE_CONSUMED',
        filamentId: body.filamentId,
        requestId: body.requestId,
        usageRecordId: usage.id,
        actorId: req.user!.id,
        employeeId,
        quantityKg: roundKg(body.quantityUsedKg),
        employeePreviousBalanceKg: previousBalance,
        employeeNewBalanceKg: newBalance,
        reason: 'Employee recorded filament usage',
        notes: body.notes
      }
    });
    return usage;
  });

  await audit(req, { action: 'CREATE_USAGE', entity: 'UsageRecord', entityId: result.id, after: result as unknown as Prisma.InputJsonValue });
  res.status(201).json(result);
}));

usageRouter.get('/employee/:employeeId/history', requireRoles('ADMIN', 'MANAGER', 'EMPLOYEE'), asyncHandler(async (req, res) => {
  const employeeId = routeParam(req.params.employeeId, 'employeeId');
  if (req.user!.role === 'EMPLOYEE' && employeeId !== req.user!.id) throw forbidden('Employees can only view their own history');
  const items = await prisma.usageRecord.findMany({
    where: { employeeId },
    include: { filament: true, request: true },
    orderBy: { usedAt: 'desc' },
    take: 200
  });
  res.json(items);
}));
