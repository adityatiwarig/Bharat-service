# GovCRM: PostgreSQL + AI Complaint CRM

GovCRM is a Next.js 16 complaint management platform for Delhi wards with four role-based workspaces:

- `citizen`: signup, submit complaints, track status, rate resolution
- `worker`: review ward assignments, update complaint lifecycle
- `admin`: monitor queues, hotspots, categories, and users
- `leader`: view executive ward summaries and trend snapshots

The system has been refactored away from MongoDB and now uses PostgreSQL-backed services, secure cookie auth, and a rule-based AI triage pipeline.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create `.env` or `.env.local`

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/govcrm
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/govcrm
SESSION_SECRET=replace-with-a-long-random-secret
```

For Neon or another hosted Postgres, keep `DATABASE_URL` as the pooled runtime URL and set
`DIRECT_URL` to the direct, non-pooler connection string for Prisma CLI commands.

3. Create schema + seed wards

```bash
psql "$DATABASE_URL" -f scripts/setup-db.sql
```

Or use Prisma migrations:

```bash
npm run prisma:migrate -- --name init
```

4. Start the app

```bash
npm run dev
```

5. Open `http://localhost:3000/auth`

## Demo Logins

- Citizen: `citizen@govcrm.demo` / `changeme`
- Worker: `worker.rohini@govcrm.demo` / `changeme`
- Admin: `admin@govcrm.demo` / `changeme`
- Leader: `leader@govcrm.demo` / `changeme`

## Database Output

### PostgreSQL schema

- SQL schema: [scripts/setup-db.sql](/d:/smartcrm/scripts/setup-db.sql)
- Prisma schema: [prisma/schema.prisma](/d:/smartcrm/prisma/schema.prisma)

Core tables:

- `users (id, name, email, password, role, ...)`
- `wards (id, name, city, ...)`
- `workers (id, user_id, ward_id, ...)`
- `complaints (id, user_id, ward_id, title, text, category, status, priority, risk_score, ...)`
- `complaint_updates (id, complaint_id, status, note, updated_at, updated_by_user_id)`
- `ratings (id, complaint_id, rating, feedback)`

Key indexing:

- Composite complaint index on `(ward_id, priority, status, created_at DESC)`
- Supporting indexes for `user_id`, `assigned_worker_id`, and `complaint_updates`

## Backend Output

### API structure

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/wards`
- `GET /api/users`
- `GET /api/dashboard/admin`
- `GET /api/dashboard/worker`
- `GET /api/complaints`
- `POST /api/complaints`
- `GET /api/complaints/[id]`
- `PATCH /api/complaints/[id]`
- `POST /api/complaints/[id]/rating`
- `GET /api/uploads/[storage]/[id]`

Primary server modules:

- DB client: [lib/server/db.ts](/d:/smartcrm/lib/server/db.ts)
- Auth/session: [lib/server/auth.ts](/d:/smartcrm/lib/server/auth.ts), [lib/server/session.ts](/d:/smartcrm/lib/server/session.ts)
- Complaint lifecycle: [lib/server/complaints.ts](/d:/smartcrm/lib/server/complaints.ts)
- Dashboard aggregation: [lib/server/dashboard.ts](/d:/smartcrm/lib/server/dashboard.ts)
- Ward/user services: [lib/server/wards.ts](/d:/smartcrm/lib/server/wards.ts), [lib/server/users.ts](/d:/smartcrm/lib/server/users.ts)

## AI Output

### AI scoring module

- Rule-based AI module: [lib/server/ai.ts](/d:/smartcrm/lib/server/ai.ts)

Implemented logic:

- Keyword detection
- Sentiment scoring
- Risk scoring formula
- Auto priority classification
- Fallback to `other`
- Spam detection for short/repeated/test-like submissions
- Hotspot detection for repeated ward complaints within 24 hours
- Auto worker assignment by ward

Risk formula:

```text
risk_score =
  (keyword_weight * 0.4) +
  (sentiment * 0.2) +
  (location_weight * 0.2) +
  (frequency * 0.2)
```

## Frontend Output

### Key frontend components

- Session-aware dashboard shell: [components/dashboard-layout.tsx](/d:/smartcrm/components/dashboard-layout.tsx)
- Session provider: [components/session-provider.tsx](/d:/smartcrm/components/session-provider.tsx)
- Complaint card: [components/complaint-card.tsx](/d:/smartcrm/components/complaint-card.tsx)
- Status badges: [components/status-badge.tsx](/d:/smartcrm/components/status-badge.tsx)
- Complaint skeleton loader: [components/complaint-card-skeleton.tsx](/d:/smartcrm/components/complaint-card-skeleton.tsx)
- Pagination controls: [components/pagination-controls.tsx](/d:/smartcrm/components/pagination-controls.tsx)

Role pages:

- Citizen dashboard and flows: [app/citizen/page.tsx](/d:/smartcrm/app/citizen/page.tsx), [app/citizen/submit/page.tsx](/d:/smartcrm/app/citizen/submit/page.tsx), [app/citizen/my-complaints/page.tsx](/d:/smartcrm/app/citizen/my-complaints/page.tsx), [app/citizen/tracker/page.tsx](/d:/smartcrm/app/citizen/tracker/page.tsx)
- Worker flows: [app/worker/page.tsx](/d:/smartcrm/app/worker/page.tsx), [app/worker/assigned/page.tsx](/d:/smartcrm/app/worker/assigned/page.tsx), [app/worker/updates/page.tsx](/d:/smartcrm/app/worker/updates/page.tsx)
- Admin views: [app/admin/page.tsx](/d:/smartcrm/app/admin/page.tsx), [app/admin/complaints/page.tsx](/d:/smartcrm/app/admin/complaints/page.tsx), [app/admin/analytics/page.tsx](/d:/smartcrm/app/admin/analytics/page.tsx), [app/admin/users/page.tsx](/d:/smartcrm/app/admin/users/page.tsx)
- Leader views: [app/leader/page.tsx](/d:/smartcrm/app/leader/page.tsx), [app/leader/reports/page.tsx](/d:/smartcrm/app/leader/reports/page.tsx), [app/leader/trends/page.tsx](/d:/smartcrm/app/leader/trends/page.tsx), [app/leader/ward-comparison/page.tsx](/d:/smartcrm/app/leader/ward-comparison/page.tsx)

### Loading spinner component

- Spinner: [components/ui/spinner.tsx](/d:/smartcrm/components/ui/spinner.tsx)

Also used:

- Progress indicator: [components/ui/progress.tsx](/d:/smartcrm/components/ui/progress.tsx)
- Toasts: [components/ui/sonner.tsx](/d:/smartcrm/components/ui/sonner.tsx)

## Example Queries

### List urgent complaints in a ward

```sql
SELECT id, tracking_code, title, priority, status, risk_score, created_at
FROM complaints
WHERE ward_id = 1
  AND priority IN ('high', 'critical')
ORDER BY risk_score DESC, created_at DESC
LIMIT 10;
```

### Resolution rate by ward

```sql
SELECT
  w.name,
  COUNT(c.id) AS total_complaints,
  COUNT(*) FILTER (WHERE c.status = 'resolved') AS resolved_complaints,
  ROUND(
    (COUNT(*) FILTER (WHERE c.status = 'resolved')::numeric / NULLIF(COUNT(c.id), 0)) * 100,
    2
  ) AS resolution_rate
FROM wards w
LEFT JOIN complaints c ON c.ward_id = w.id
GROUP BY w.id, w.name
ORDER BY resolution_rate DESC NULLS LAST;
```

### Hotspot detection in last 24 hours

```sql
SELECT w.name, COUNT(*) AS complaint_count
FROM complaints c
JOIN wards w ON w.id = c.ward_id
WHERE c.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY w.id, w.name
HAVING COUNT(*) >= 3
ORDER BY complaint_count DESC;
```

### Worker workload

```sql
SELECT
  u.name AS worker_name,
  w.name AS ward_name,
  COUNT(c.id) AS open_cases
FROM workers wk
JOIN users u ON u.id = wk.user_id
JOIN wards w ON w.id = wk.ward_id
LEFT JOIN complaints c
  ON c.assigned_worker_id = wk.id
 AND c.status IN ('assigned', 'in_progress')
GROUP BY u.name, w.name
ORDER BY open_cases ASC, worker_name ASC;
```

## Validation

Verified locally in this workspace:

- TypeScript: `node_modules\\.bin\\tsc.cmd --noEmit`
- Production build: `npm.cmd run build`
