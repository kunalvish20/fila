import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: process.env.ENV_FILE || path.resolve(__dirname, '../../../.env') });
dotenv.config();

const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_URL: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z.preprocess((value) => value === true || value === 'true', z.boolean()).default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  LOW_STOCK_EMAIL_TO: z.string().optional(),
  DEV_AUTH_BYPASS: z.preprocess((value) => value === true || value === 'true', z.boolean()).default(false),
  DEV_AUTH_BYPASS_EMAIL: z.string().email().default('admin@filament.local'),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_ADMIN_EMAILS: z.preprocess(emptyToUndefined, z.string().optional())
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  DEV_AUTH_BYPASS: parsed.data.NODE_ENV === 'production' ? false : parsed.data.DEV_AUTH_BYPASS
};
export const isProduction = config.NODE_ENV === 'production';
