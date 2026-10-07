import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden } from '../lib/errors.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email().transform((v) => v.toLowerCase()), password: z.string().min(1) });

function publicUser(user: { id: string; name: string; email: string; role: string; active: boolean; employeeCode?: string | null; department?: string | null }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, employeeCode: user.employeeCode, department: user.department };
}

authRouter.post('/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.active) throw forbidden('Invalid email or password');

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw forbidden('Invalid email or password');

  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  res.json({ token, user: publicUser(user) });
}));

authRouter.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw forbidden('Account not found');
  res.json({ user: publicUser(user) });
}));

authRouter.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });
  const body = schema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw forbidden('Account not found');
  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!ok) throw badRequest('Current password is incorrect');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 12) } });
  res.json({ message: 'Password updated successfully' });
}));
