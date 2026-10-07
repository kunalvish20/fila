import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, canManageInventory } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/pagination.js';
import { calculateFilamentStatus, roundKg } from '../utils/inventory.js';
import { audit } from '../utils/audit.js';
import { badRequest, notFound } from '../lib/errors.js';
import { notifyMany } from '../utils/notify.js';
import { config } from '../config.js';
import { sendEmail, emailShell } from '../utils/email.js';
import { routeParam } from '../utils/request.js';

export const filamentsRouter = Router();
filamentsRouter.use(authenticate);

const includeBase = { createdBy: { select: { id: true, name: true, email: true } } };

filamentsRouter.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const material = typeof req.query.material === 'string' ? req.query.material : undefined;
  const where: Prisma.FilamentWhereInput = {
    active: req.query.active === 'false' ? false : true,
    ...(status ? { status: status as any } : {}),
    ...(material ? { material: { equals: material, mode: 'insensitive' } } : {}),
    ...(search ? { OR: [
      { filamentId: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { material: { contains: search, mode: 'insensitive' } },
      { color: { contains: search, mode: 'insensitive' } },
      { batchNumber: { contains: search, mode: 'insensitive' } },
      { storageLocation: { contains: search, mode: 'insensitive' } }
    ] } : {})
  };
  const [items, total] = await Promise.all([
    prisma.filament.findMany({ where, include: includeBase, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
    prisma.filament.count({ where })
  ]);
  res.json({ items, total, page, limit });
}));

filamentsRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = routeParam(req.params.id);
  const filament = await prisma.filament.findUnique({
    where: { id },
    include: {
      ...includeBase,
      balances: { include: { user: { select: { id: true, name: true, email: true, employeeCode: true } } }, orderBy: { updatedAt: 'desc' } },
      transactions: { include: { actor: { select: { id: true, name: true } }, employee: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }
    }
  });
  if (!filament) throw notFound('Filament not found');
  res.json(filament);
}));

const filamentSchema = z.object({
  filamentId: z.string().min(2),
  brand: z.string().min(1),
  material: z.string().min(1),
  color: z.string().min(1),
  spoolSizeKg: z.coerce.number().positive(),
  initialQuantityKg: z.coerce.number().nonnegative(),
  currentQuantityKg: z.coerce.number().nonnegative().optional(),
  minimumStockKg: z.coerce.number().nonnegative(),
  costPerKg: z.coerce.number().nonnegative(),
  supplier: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  batchNumber: z.string().optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional()
});

filamentsRouter.post('/', canManageInventory, asyncHandler(async (req, res) => {
  const body = filamentSchema.parse(req.body);
  const current = roundKg(body.currentQuantityKg ?? body.initialQuantityKg);
  const status = calculateFilamentStatus(current, body.minimumStockKg);
  const filament = await prisma.$transaction(async (tx) => {
    const created = await tx.filament.create({
      data: {
        ...body,
        currentQuantityKg: current,
        status,
        createdById: req.user!.id
      }
    });
    await tx.inventoryTransaction.create({
      data: {
        type: 'STOCK_IN',
        filamentId: created.id,
        actorId: req.user!.id,
        quantityKg: current,
        warehousePreviousQtyKg: 0,
        warehouseNewQtyKg: current,
        reason: 'Initial stock entry',
        notes: body.notes
      }
    });
    return created;
  });
  await audit(req, { action: 'CREATE_FILAMENT', entity: 'Filament', entityId: filament.id, after: filament as unknown as Prisma.InputJsonValue });
  res.status(201).json(filament);
}));

const updateFilamentSchema = filamentSchema.partial().extend({ active: z.boolean().optional() });

filamentsRouter.patch('/:id', canManageInventory, asyncHandler(async (req, res) => {
  const before = await prisma.filament.findUnique({ where: { id: routeParam(req.params.id) } });
  if (!before) throw notFound('Filament not found');
  const body = updateFilamentSchema.parse(req.body);
  const nextCurrent = body.currentQuantityKg !== undefined ? roundKg(body.currentQuantityKg) : Number(before.currentQuantityKg);
  const nextMinimum = body.minimumStockKg !== undefined ? body.minimumStockKg : Number(before.minimumStockKg);
  const status = calculateFilamentStatus(nextCurrent, nextMinimum);

  const updated = await prisma.$transaction(async (tx) => {
    const filament = await tx.filament.update({
      where: { id: before.id },
      data: { ...body, currentQuantityKg: nextCurrent, status }
    });
    if (body.currentQuantityKg !== undefined && Number(before.currentQuantityKg) !== nextCurrent) {
      await tx.inventoryTransaction.create({
        data: {
          type: 'ADJUSTMENT',
          filamentId: before.id,
          actorId: req.user!.id,
          quantityKg: roundKg(Math.abs(nextCurrent - Number(before.currentQuantityKg))),
          warehousePreviousQtyKg: before.currentQuantityKg,
          warehouseNewQtyKg: nextCurrent,
          reason: 'Manual inventory adjustment',
          notes: body.notes
        }
      });
    }
    return filament;
  });

  if (updated.status === 'LOW_STOCK' || updated.status === 'OUT_OF_STOCK') {
    const admins = await prisma.user.findMany({ where: { active: true, role: { in: ['ADMIN', 'MANAGER'] } } });
    await notifyMany(admins, {
      type: 'LOW_STOCK',
      title: `${updated.filamentId} is ${updated.status.replace('_', ' ').toLowerCase()}`,
      message: `${updated.brand} ${updated.material} ${updated.color} has ${updated.currentQuantityKg}kg remaining.`,
      metadata: { filamentId: updated.id },
      email: true
    });
    await sendEmail(config.LOW_STOCK_EMAIL_TO, `Low stock alert: ${updated.filamentId}`, emailShell('Low stock alert', `<p>${updated.brand} ${updated.material} ${updated.color} has ${updated.currentQuantityKg}kg remaining.</p>`));
  }

  await audit(req, { action: 'UPDATE_FILAMENT', entity: 'Filament', entityId: updated.id, before: before as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue });
  res.json(updated);
}));

filamentsRouter.post('/:id/adjust', canManageInventory, asyncHandler(async (req, res) => {
  const schema = z.object({ adjustmentKg: z.coerce.number(), reason: z.string().min(3), notes: z.string().optional() });
  const body = schema.parse(req.body);
  if (body.adjustmentKg === 0) throw badRequest('Adjustment cannot be zero');
  const before = await prisma.filament.findUnique({ where: { id: routeParam(req.params.id) } });
  if (!before) throw notFound('Filament not found');
  const next = roundKg(Number(before.currentQuantityKg) + body.adjustmentKg);
  if (next < 0) throw badRequest('Adjustment would make stock negative');
  const status = calculateFilamentStatus(next, before.minimumStockKg);
  const updated = await prisma.$transaction(async (tx) => {
    const filament = await tx.filament.update({ where: { id: before.id }, data: { currentQuantityKg: next, status } });
    await tx.inventoryTransaction.create({
      data: {
        type: 'ADJUSTMENT',
        filamentId: before.id,
        actorId: req.user!.id,
        quantityKg: Math.abs(body.adjustmentKg),
        warehousePreviousQtyKg: before.currentQuantityKg,
        warehouseNewQtyKg: next,
        reason: body.reason,
        notes: body.notes
      }
    });
    return filament;
  });
  await audit(req, { action: 'ADJUST_STOCK', entity: 'Filament', entityId: updated.id, before: before as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue });
  res.json(updated);
}));
