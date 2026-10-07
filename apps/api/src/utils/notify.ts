import type { NotificationType, Prisma, User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendEmail, emailShell } from './email.js';

export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  email?: boolean;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata
    },
    include: { user: true }
  });

  if (params.email) {
    await sendEmail(notification.user.email, params.title, emailShell(params.title, `<p>${params.message}</p>`));
  }

  return notification;
}

export async function notifyMany(users: Pick<User, 'id'>[], payload: Omit<Parameters<typeof notifyUser>[0], 'userId'>) {
  await Promise.all(users.map((user) => notifyUser({ ...payload, userId: user.id })));
}
