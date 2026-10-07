import { createClient } from '@supabase/supabase-js';
import type { UserRole } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from './prisma.js';

export const isSupabaseConfigured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const roles: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

function normalizeRole(value: unknown, email?: string): UserRole {
  const adminEmails = (config.SUPABASE_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (email && adminEmails.includes(email.toLowerCase())) return 'ADMIN';
  if (typeof value === 'string' && roles.includes(value.toUpperCase() as UserRole)) return value.toUpperCase() as UserRole;
  return 'EMPLOYEE';
}

export async function getAppUserFromSupabaseToken(token: string) {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const authUser = data.user;
  const email = data.user.email.toLowerCase();
  const metadata = authUser.user_metadata || {};
  const role = normalizeRole(metadata.role, email);
  const name = String(metadata.full_name || metadata.name || email.split('@')[0] || 'Supabase User');

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      active: true
    },
    create: {
      id: authUser.id,
      name,
      email,
      role,
      active: true,
      passwordHash: 'SUPABASE_AUTH_USER'
    }
  });
}
