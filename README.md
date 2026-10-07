# FilamentOps — Production-Ready Filament Tracking & Inventory Management

A complete full-stack filament tracking system for a 3D printing business. It uses manual manager requests, employee acceptance/rejection, actual quantity entry, issued employee balances, usage recording, immutable transaction history, dashboards, reports, email notifications, audit logs, and role-based access control.

QR scanning is intentionally not required and no QR scanner code is included.

## Stack

- Frontend: React 19, Vite, TypeScript, Recharts, responsive CSS
- Backend: Node.js, Express 5, TypeScript, Prisma, PostgreSQL
- Auth: JWT + bcrypt password hashing
- Security: Helmet, CORS allowlist, rate limiting, RBAC, input validation with Zod
- Email: Nodemailer SMTP via `.env`
- Database: PostgreSQL with Prisma schema and migration SQL

## Roles

| Role | Access |
|---|---|
| Admin | Full access to inventory, users, requests, usage, reports, settings, audit logs |
| Manager | Inventory view/manage, create requests, monitor usage, reports |
| Employee | Assigned requests, accept/reject, record actual received quantity, record usage, view own history |

## Core Workflow

1. Manager/Admin creates a request: `Filament → Quantity → Purpose/Project → Notes → Submit`.
2. Employee receives in-app notification and email.
3. Employee accepts or rejects.
4. On accept, employee enters actual received quantity.
5. Warehouse stock is deducted automatically.
6. Employee assigned balance is increased.
7. Immutable `REQUEST_ISSUED` transaction is created.
8. Employee records usage against project/order.
9. Assigned balance is reduced and immutable `USAGE_CONSUMED` transaction is created.
10. Low-stock/out-of-stock alerts are generated automatically.

## Required Environment Variables

Copy `.env.example` to `.env` and update values.

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes | API server port, default `4000` |
| `JWT_SECRET` | Yes | Minimum 32 chars. Use a strong random secret in production |
| `JWT_EXPIRES_IN` | Yes | JWT expiry, default `7d` |
| `CORS_ORIGIN` | Yes | Frontend origin, comma-separated if multiple |
| `APP_URL` | Yes | Public frontend URL for emails |
| `SMTP_HOST` | No | SMTP host for email notifications |
| `SMTP_PORT` | No | SMTP port, usually `587` |
| `SMTP_SECURE` | No | `true` for SSL, `false` for STARTTLS |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password/app password |
| `SMTP_FROM` | No | Sender label/address |
| `LOW_STOCK_EMAIL_TO` | No | Admin/purchase email for low stock alerts |
| `VITE_API_URL` | Yes | Frontend API URL, e.g. `http://localhost:4000/api` |

If SMTP variables are not configured, in-app notifications still work and email sends are safely skipped with a server log message.

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL

Option A — Docker:

```bash
docker compose up -d
```

Option B — Use your own PostgreSQL and update `DATABASE_URL`.

### 3. Run Migration and Seed Data

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## Demo Accounts

All demo accounts use password: `Admin@12345`

| Role | Email |
|---|---|
| Admin | `admin@filament.local` |
| Manager | `manager@filament.local` |
| Employee | `employee@filament.local` |

Change these credentials immediately before production use.

## Production Build

```bash
npm run build
npm run db:deploy
npm run start
```

Serve the frontend `apps/web/dist` folder with Nginx, Vercel, Netlify, Cloudflare Pages, or your preferred static host. Set `VITE_API_URL` to the production API URL before building the frontend.

## Main API Endpoints

All protected endpoints require:

```http
Authorization: Bearer <token>
```

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Users / Employees

- `GET /api/users`
- `POST /api/users` Admin only
- `PATCH /api/users/:id` Admin only

### Filaments

- `GET /api/filaments`
- `GET /api/filaments/:id`
- `POST /api/filaments` Admin/Manager
- `PATCH /api/filaments/:id` Admin/Manager
- `POST /api/filaments/:id/adjust` Admin/Manager

### Requests

- `GET /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests` Admin/Manager
- `POST /api/requests/:id/accept` Employee/Admin
- `POST /api/requests/:id/reject` Employee/Admin
- `POST /api/requests/:id/cancel` Admin/Manager

### Usage

- `GET /api/usage`
- `GET /api/usage/balances`
- `POST /api/usage`
- `GET /api/usage/employee/:employeeId/history`

### Reports / Dashboard

- `GET /api/dashboard/stats`
- `GET /api/reports/summary`
- `GET /api/reports/inventory-value`

### Transactions / Notifications / Settings

- `GET /api/transactions`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/settings` Admin only
- `PUT /api/settings/:key` Admin only
- `GET /api/audit` Admin only

## Security Notes

- Passwords are hashed with bcrypt.
- JWT secret is required and validated on boot.
- Every sensitive route uses authentication and role-based authorization.
- Inputs are validated with Zod.
- Inventory issuing and usage are wrapped in database transactions.
- Transaction records are append-only through the public API.
- Audit logs are written for critical mutations.
- Secrets must stay in `.env` and must never be committed.

## Data Model Highlights

- `Filament`: warehouse stock master, with automatic status calculation.
- `FilamentRequest`: manager-to-employee request workflow.
- `EmployeeFilamentBalance`: issued stock currently held by each employee.
- `UsageRecord`: project/order usage submitted by employees.
- `InventoryTransaction`: immutable stock movement/history ledger.
- `Notification`: in-app notifications with optional SMTP email.
- `AuditLog`: admin-visible mutation trail.

## Production Checklist

Before going live:

1. Replace demo credentials.
2. Set a strong `JWT_SECRET`.
3. Use managed PostgreSQL with backups.
4. Configure SMTP credentials.
5. Configure production `CORS_ORIGIN` and `VITE_API_URL`.
6. Run `npm run build`.
7. Run `npm run db:deploy` against production database.
8. Put the API behind HTTPS and a reverse proxy.
9. Enable database backups and monitoring.
10. Review admin users and deactivate demo accounts.
