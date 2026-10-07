import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/pagination.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { makeCode } from '../utils/ids.js';
import { calculateFilamentStatus, roundKg } from '../utils/inventory.js';
import { notifyUser, notifyMany } from '../utils/notify.js';
import { audit } from '../utils/audit.js';
import { routeParam } from '../utils/request.js';

export const requestsRouter = Router();
requestsRouter.use(authenticate);

const requestInclude = {
  manager: { select: { id: true, name: true, email: true } },
  employee: { select: { id: true, name: true, email: true, employeeCode: true, department: true } },
  filament: true
} satisfies Prisma.FilamentRequestInclude;

function scopedWhere(user: Express.UserContext, base: Prisma.FilamentRequestWhereInput = {}) {
  if (user.role === 'ADMIN') return base;
  if (user.role === 'MANAGER') return { ...base, managerId: user.id };
  return { ...base, employeeId: user.id };
}

requestsRouter.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const base: Prisma.FilamentRequestWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(search ? { OR: [
      { requestCode: { contains: search, mode: 'insensitive' } },
      { purpose: { contains: search, mode: 'insensitive' } },
      { employee: { name: { contains: search, mode: 'insensitive' } } },
      { filament: { filamentId: { contains: search, mode: 'insensitive' } } },
      { filament: { brand: { contains: search, mode: 'insensitive' } } }
    ] } : {})
  };
  const where = scopedWhere(req.user!, base);
  const [items, total] = await Promise.all([
    prisma.filamentRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.filamentRequest.count({ where })
  ]);
  res.json({ items, total, page, limit });
}));

requestsRouter.get('/:id', asyncHandler(async (req, res) => {
  const request = await prisma.filamentRequest.findFirst({ where: scopedWhere(req.user!, { id: routeParam(req.params.id) }), include: { ...requestInclude, usages: true, transactions: true } });
  if (!request) throw notFound('Request not found');
  res.json(request);
}));

const createRequestSchema = z.object({
  employeeId: z.string().min(1),
  filamentId: z.string().min(1),
  requestedQuantityKg: z.coerce.number().positive(),
  purpose: z.string().min(3),
  notes: z.string().optional()
});

requestsRouter.post('/', requireRoles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const body = createRequestSchema.parse(req.body);
  const [employee, filament] = await Promise.all([
    prisma.user.findUnique({ where: { id: body.employeeId } }),
    prisma.filament.findUnique({ where: { id: body.filamentId } })
  ]);
  if (!employee || employee.role !== 'EMPLOYEE' || !employee.active) throw badRequest('Select an active employee');
  if (!filament || !filament.active) throw badRequest('Select an active filament');
  if (body.requestedQuantityKg > Number(filament.currentQuantityKg)) throw badRequest('Requested quantity exceeds current warehouse stock');

  const request = await prisma.filamentRequest.create({
    data: {
      requestCode: makeCode('REQ'),
      managerId: req.user!.id,
      employeeId: employee.id,
      filamentId: filament.id,
      requestedQuantityKg: roundKg(body.requestedQuantityKg),
      purpose: body.purpose,
      notes: body.notes
    },
    include: requestInclude
  });

  await notifyUser({
    userId: employee.id,
    type: 'REQUEST_CREATED',
    title: 'New filament request assigned',
    message: `${req.user!.name} requested ${request.requestedQuantityKg}kg of ${filament.brand} ${filament.material} ${filament.color} for ${request.purpose}.`,
    metadata: { requestId: request.id },
    email: true
  });
  await audit(req, { action: 'CREATE_REQUEST', entity: 'FilamentRequest', entityId: request.id, after: request as unknown as Prisma.InputJsonValue });
  res.status(201).json(request);
}));

const acceptSchema = z.object({ actualReceivedQuantityKg: z.coerce.number().positive(), employeeRemarks: z.string().optional() });

requestsRouter.post('/:id/accept', requireRoles('ADMIN', 'EMPLOYEE'), asyncHandler(async (req, res) => {
  const body = acceptSchema.parse(req.body);
  const existing = await prisma.filamentRequest.findUnique({ where: { id: routeParam(req.params.id) }, include: { filament: true, manager: true, employee: true } });
  if (!existing) throw notFound('Request not found');
  if (req.user!.role === 'EMPLOYEE' && existing.employeeId !== req.user!.id) throw forbidden('You can only accept your own requests');
  if (existing.status !== 'PENDING') throw badRequest('Only pending requests can be accepted');
  if (body.actualReceivedQuantityKg > Number(existing.requestedQuantityKg)) throw badRequest('Actual received quantity cannot exceed requested quantity');
  if (body.actualReceivedQuantityKg > Number(existing.filament.currentQuantityKg)) throw badRequest('Not enough stock available to issue this request');

  const result = await prisma.$transaction(async (tx) => {
    const filament = await tx.filament.findUnique({ where: { id: existing.filamentId } });
    if (!filament) throw notFound('Filament not found');
    const previousWarehouse = Number(filament.currentQuantityKg);
    const newWarehouse = roundKg(previousWarehouse - body.actualReceivedQuantityKg);
    const status = calculateFilamentStatus(newWarehouse, filament.minimumStockKg);

    const previousBalanceRecord = await tx.employeeFilamentBalance.findUnique({ where: { userId_filamentId: { userId: existing.employeeId, filamentId: existing.filamentId } } });
    const previousEmployeeBalance = Number(previousBalanceRecord?.quantityKg ?? 0);
    const newEmployeeBalance = roundKg(previousEmployeeBalance + body.actualReceivedQuantityKg);

    await tx.filament.update({ where: { id: filament.id }, data: { currentQuantityKg: newWarehouse, status } });
    await tx.employeeFilamentBalance.upsert({
      where: { userId_filamentId: { userId: existing.employeeId, filamentId: existing.filamentId } },
      create: { userId: existing.employeeId, filamentId: existing.filamentId, quantityKg: newEmployeeBalance },
      update: { quantityKg: newEmployeeBalance }
    });
    const request = await tx.filamentRequest.update({
      where: { id: existing.id },
      data: { status: 'ACCEPTED', actualReceivedQuantityKg: roundKg(body.actualReceivedQuantityKg), employeeRemarks: body.employeeRemarks, acceptedAt: new Date() },
      include: requestInclude
    });
    await tx.inventoryTransaction.create({
      data: {
        type: 'REQUEST_ISSUED',
        filamentId: existing.filamentId,
        requestId: existing.id,
        actorId: req.user!.id,
        employeeId: existing.employeeId,
        quantityKg: roundKg(body.actualReceivedQuantityKg),
        warehousePreviousQtyKg: previousWarehouse,
        warehouseNewQtyKg: newWarehouse,
        employeePreviousBalanceKg: previousEmployeeBalance,
        employeeNewBalanceKg: newEmployeeBalance,
        reason: 'Employee accepted filament request',
        notes: body.employeeRemarks
      }
    });
    return { request, newWarehouse, status };
  });

  await notifyUser({
    userId: existing.managerId,
    type: 'REQUEST_ACCEPTED',
    title: 'Filament request accepted',
    message: `${existing.employee.name} accepted ${body.actualReceivedQuantityKg}kg for request ${existing.requestCode}.`,
    metadata: { requestId: existing.id },
    email: true
  });

  if (result.status === 'LOW_STOCK' || result.status === 'OUT_OF_STOCK') {
    const admins = await prisma.user.findMany({ where: { active: true, role: { in: ['ADMIN', 'MANAGER'] } } });
    await notifyMany(admins, {
      type: 'LOW_STOCK',
      title: `Low stock: ${existing.filament.filamentId}`,
      message: `${existing.filament.brand} ${existing.filament.material} ${existing.filament.color} now has ${result.newWarehouse}kg remaining.`,
      metadata: { filamentId: existing.filamentId },
      email: true
    });
  }

  await audit(req, { action: 'ACCEPT_REQUEST', entity: 'FilamentRequest', entityId: existing.id, before: existing as unknown as Prisma.InputJsonValue, after: result.request as unknown as Prisma.InputJsonValue });
  res.json(result.request);
}));

const rejectSchema = z.object({ employeeRemarks: z.string().min(2) });

requestsRouter.post('/:id/reject', requireRoles('ADMIN', 'EMPLOYEE'), asyncHandler(async (req, res) => {
  const body = rejectSchema.parse(req.body);
  const existing = await prisma.filamentRequest.findUnique({ where: { id: routeParam(req.params.id) }, include: { employee: true, manager: true, filament: true } });
  if (!existing) throw notFound('Request not found');
  if (req.user!.role === 'EMPLOYEE' && existing.employeeId !== req.user!.id) throw forbidden('You can only reject your own requests');
  if (existing.status !== 'PENDING') throw badRequest('Only pending requests can be rejected');
  const request = await prisma.filamentRequest.update({
    where: { id: existing.id },
    data: { status: 'REJECTED', employeeRemarks: body.employeeRemarks, rejectedAt: new Date() },
    include: requestInclude
  });
  await notifyUser({
    userId: existing.managerId,
    type: 'REQUEST_REJECTED',
    title: 'Filament request rejected',
    message: `${existing.employee.name} rejected request ${existing.requestCode}. Remarks: ${body.employeeRemarks}`,
    metadata: { requestId: existing.id },
    email: true
  });
  await audit(req, { action: 'REJECT_REQUEST', entity: 'FilamentRequest', entityId: existing.id, before: existing as unknown as Prisma.InputJsonValue, after: request as unknown as Prisma.InputJsonValue });
  res.json(request);
}));

requestsRouter.post('/:id/cancel', requireRoles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const schema = z.object({ managerRemarks: z.string().optional() });
  const body = schema.parse(req.body);
  const existing = await prisma.filamentRequest.findUnique({ where: { id: routeParam(req.params.id) } });
  if (!existing) throw notFound('Request not found');
  if (req.user!.role === 'MANAGER' && existing.managerId !== req.user!.id) throw forbidden('Managers can only cancel requests they created');
  if (existing.status !== 'PENDING') throw badRequest('Only pending requests can be cancelled');
  const request = await prisma.filamentRequest.update({ where: { id: existing.id }, data: { status: 'CANCELLED', managerRemarks: body.managerRemarks }, include: requestInclude });
  await audit(req, { action: 'CANCEL_REQUEST', entity: 'FilamentRequest', entityId: existing.id, before: existing as unknown as Prisma.InputJsonValue, after: request as unknown as Prisma.InputJsonValue });
  res.json(request);
}));
