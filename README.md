# AssetFlow

**Enterprise Asset & Resource Management System** — track assets through their full lifecycle, allocate them without conflicts, book shared resources by time slot, route maintenance through approvals, and run structured audit cycles. Built for the Odoo Hackathon 2026.

## Feature Tour

| Screen | Highlights |
|---|---|
| **Login / Signup** | Signup always creates an Employee account — roles are granted only by an Admin from the Employee Directory. Forgot/reset password flow included. |
| **Dashboard** | Live KPI cards (available, allocated, bookings, transfers, maintenance, upcoming returns), overdue-return banner, quick actions, recent activity feed. |
| **Organization Setup** *(Admin)* | Departments (head, parent hierarchy, activate/deactivate), asset categories with custom fields (e.g. warranty months), employee directory with role promotion. |
| **Asset Directory** | Register with auto-generated tags (`AF-0001`…), category custom fields, photos, bookable flag; search + filter by tag/serial/category/status/department; per-asset allocation & maintenance history; retire/dispose/lost lifecycle actions. |
| **Allocation & Transfer** | Double-allocation is blocked — the system shows *who currently holds the asset* and offers a transfer request instead. Transfers flow Requested → Approved → Re-allocated with history updated automatically. Returns capture condition notes. Overdue returns are auto-flagged. |
| **Resource Booking** | Day timeline per resource, overlap validation (9:30–10:30 against a 9:00–10:00 booking is rejected; 10:00–11:00 back-to-back is fine), reschedule & cancel, reminder notifications before the slot. |
| **Maintenance** | Kanban approval workflow: Pending → Approved → Technician Assigned → In Progress → Resolved. Assets flip to *Under Maintenance* on approval and back to *Available* on resolution. |
| **Audit Cycles** | Scoped cycles (department/location, date range) with assigned auditors, Verified/Missing/Damaged marking, auto-generated discrepancy reports, and close-out that updates asset statuses (confirmed missing → Lost). |
| **Reports & Analytics** | Utilization by department, allocation trends, maintenance frequency by category, booking heatmap, most-used vs idle assets, CSV export. |
| **Notifications & Activity** | Bucketed notifications (alerts / approvals / bookings) plus a full audit log of who did what, when. |

**Roles:** Admin · Asset Manager · Department Head · Employee — enforced server-side on every action.

## Stack

- **Next.js 16** (App Router, server actions) + React 19
- **Supabase Postgres** + Prisma ORM
- **NextAuth** (credentials, JWT sessions, bcrypt)
- Recharts, Lucide icons, custom design system

## Getting Started

### 1. Install

```bash
npm install
cp .env.example .env   # then fill in values
```

### 2. Database — Supabase (recommended)

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql).
3. Copy the connection strings (Project Settings → Database) into `.env`:
   - `DATABASE_URL` — transaction pooler URL (port 6543, `?pgbouncer=true`)
   - `DIRECT_URL` — session/direct URL (port 5432)

<details>
<summary>Local Postgres alternative</summary>

```bash
docker compose up -d
# .env → DATABASE_URL="postgresql://assetflow:assetflow@localhost:5432/assetflow"
npm run db:migrate
npm run db:seed
```
</details>

### 3. Run

```bash
npm run dev
```

### Demo accounts (all `password123`)

| Role | Email |
|---|---|
| Admin | `admin@assetflow.com` |
| Asset Manager | `arjun@assetflow.com` |
| Department Head | `a.rao@assetflow.com` |
| Employee | `priya@assetflow.com` |

### Pre-seeded demo scenarios

- **Allocation conflict** — `AF-0001` is held by Priya Shah. Try allocating it to anyone else: the system blocks it and offers a transfer request.
- **Booking overlap** — Conference Room B2 is booked 09:00–10:00 today. Request 09:30–10:30 → rejected. Request 10:00–11:00 → accepted (back-to-back is allowed).
- **Maintenance kanban** — one request in every workflow column.
- **Open audit cycle** — with Missing + Damaged discrepancies ready to review and close.
- **Overdue returns** — two allocations past their expected return date drive the dashboard banner and notifications.

## Project Structure

```
app/
  (auth)/         login, signup, forgot/reset password
  (app)/          dashboard, org-setup, assets, allocations,
                  bookings, maintenance, audits, reports, notifications
components/       shared shell (sidebar, topbar)
lib/
  actions/        server actions (all mutations + RBAC checks)
  auth.ts         NextAuth configuration
  rbac.ts         role → permission matrix
prisma/           schema, migrations, TypeScript seeder
supabase/         schema.sql + seed.sql for the Supabase SQL editor
#Commiting to push
```
