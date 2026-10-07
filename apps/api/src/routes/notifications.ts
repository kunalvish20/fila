import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { routeParam } from '../utils/request.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(notifications);
}));

notificationsRouter.patch('/:id/read', asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findFirst({ where: { id: routeParam(req.params.id), userId: req.user!.id } });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  res.json(updated);
}));

notificationsRouter.post('/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ message: 'All notifications marked as read' });
}));
