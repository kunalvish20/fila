# Run locally with login bypass

This project now has a local-only auth bypass for testing the whole app without entering login credentials.

## 1) Create local env

This command works on Windows, Mac, and Linux:

```bash
npm run use:local-bypass
```

Manual Windows PowerShell alternative:

```powershell
Copy-Item .env.local-dev .env
```

## 2) Start local PostgreSQL

```bash
docker compose up -d
```

## 3) Install and prepare DB

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

Shortcut after Docker is running:

```bash
npm run setup:bypass
```

## 4) Run full project locally

```bash
npm run dev
```

Open:

- Frontend: http://localhost:5173
- API health: http://localhost:4000/health

With `.env.local-dev`, the frontend opens directly as an admin user and backend protected APIs run as `admin@filament.local`.

## Change bypass user/role

To test as another role, edit `.env`:

```env
DEV_AUTH_BYPASS_EMAIL="manager@filament.local"
VITE_AUTH_BYPASS_EMAIL="manager@filament.local"
VITE_AUTH_BYPASS_ROLE="MANAGER"
```

or:

```env
DEV_AUTH_BYPASS_EMAIL="employee@filament.local"
VITE_AUTH_BYPASS_EMAIL="employee@filament.local"
VITE_AUTH_BYPASS_ROLE="EMPLOYEE"
```

Then restart `npm run dev`.

## Turn login back on

Set both values to false:

```env
DEV_AUTH_BYPASS=false
VITE_AUTH_BYPASS=false
```

Then login with seeded accounts:

- admin@filament.local / Admin@12345
- manager@filament.local / Admin@12345
- employee@filament.local / Admin@12345

## Safety note

The bypass is ignored automatically when `NODE_ENV=production`. Keep `.env.local-dev` only for local testing.
