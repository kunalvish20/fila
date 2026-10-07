# Supabase Setup

This project now supports Supabase Auth with Google login while keeping Prisma as the app data layer.

## 1. Create a Supabase project

In Supabase, create a project and copy:

- Project URL
- anon public key
- service role key
- Postgres connection string

Use the pooled Postgres connection string for `DATABASE_URL` when possible.

## 2. Configure `.env`

Set these values:

```env
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_ADMIN_EMAILS="your-admin@gmail.com"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
DEV_AUTH_BYPASS=false
VITE_AUTH_BYPASS=false
```

`SUPABASE_ADMIN_EMAILS` is a comma-separated list. Those users become `ADMIN` the first time they sign in with Google.

## 3. Enable Google login

In Supabase Dashboard:

1. Go to Authentication > Providers.
2. Enable Google.
3. Add your Google OAuth client ID and secret.
4. Add this app URL in Authentication > URL Configuration:

```txt
http://localhost:5173
http://localhost:5174
```

If the app runs on a different Vite port, add that port too.

## 4. Push the database schema

Run:

```bash
npm run db:generate
npm run db:deploy
```

For a fresh development database, you can seed demo inventory:

```bash
npm run db:seed
```

## 5. Start the app

Run:

```bash
npm run dev
```

Open the Vite URL and use **Continue with Google**.
