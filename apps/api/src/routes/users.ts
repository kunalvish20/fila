import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { adminOnly, authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/pagination.js';
import { audit } from '../utils/audit.js';
import { notFound } from '../lib/errors.js';
import { routeParam } from '../utils/request.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

const userSelect = {
  id: true, name: true, email: true, role: true, active: true, employeeCode: true, department: true, phone: true, createdAt: true, updatedAt: true
};

usersRouter.get('/', requireRoles('ADMIN', 'MANAGER'), asyncHandler(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const role = typeof req.query.role === 'string' ? req.query.role : undefined;
  const where: Prisma.UserWhereInput = {
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } }
    ] } : {}),
    ...(role ? { role: role as any } : {})
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where })
  ]);
  res.json({ items, total, page, limit });
}));

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  employeeCode: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional()
});

usersRouter.post('/', adminOnly, asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const { password, ...data } = body;
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
    select: userSelect
  });
  await audit(req, { action: 'CREATE_USER', entity: 'User', entityId: user.id, after: user });
  res.status(201).json(user);
}));

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().transform((v) => v.toLowerCase()).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  active: z.boolean().optional(),
  employeeCode: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  phone: z.string().nullable().optional()
});

usersRouter.patch('/:id', adminOnly, asyncHandler(async (req, res) => {
  const id = routeParam(req.params.id);
  const before = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!before) throw notFound('User not found');
  const body = updateSchema.parse(req.body);
  const { password, ...data } = body;
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {})
    },
    select: userSelect
  });
  await audit(req, { action: 'UPDATE_USER', entity: 'User', entityId: user.id, before, after: user });
  res.json(user);
}));
