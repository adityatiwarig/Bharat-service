# GovCRM

GovCRM is a role-based civic complaint management platform built with Next.js, React, Prisma, and PostgreSQL. It is designed around a Delhi ward workflow where citizens raise complaints, department heads review and assign them, workers execute field work, and admin users monitor the full system.

This README focuses on project overview, working flow, architecture, routes, and setup. Runtime environment values are intentionally not listed here.

## What The Project Does

The app supports four distinct workspaces:

- `citizen`: register, submit complaints, track live status, review proof, and rate the resolution
- `worker`: view assigned complaints, start work, and submit proof after completion
- `leader`: department-head review, complaint scrutiny, worker assignment, closure, and reopen flow
- `admin`: platform-wide monitoring, complaint analytics, hotspots, and user visibility

The system also exposes a public tracking page where anyone with a tracking code can see a limited complaint summary without seeing private complaint details.

## Core Stack

- Next.js App Router
- React 19
- TypeScript
- Prisma with PostgreSQL
- Tailwind CSS and Radix UI based components
- Cookie-based auth with server-side role guards
- Local file storage for complaint attachments and proof images
- Redis-backed cache when available, with in-memory fallback when Redis is missing or unavailable

## High-Level Architecture

The app is split into a few clear layers:

- `app/`
  App Router pages, layouts, and API routes
- `components/`
  Shared UI, dashboard shells, trackers, cards, and workspace widgets
- `lib/client/`
  Browser-side API wrappers
- `lib/server/`
  Auth, complaint lifecycle, dashboards, uploads, notifications, caching, and reporting services
- `prisma/`
  Prisma schema and migrations
- `scripts/`
  SQL bootstrap and maintenance scripts
- `data/uploads/`
  Persisted evidence and attachment files written by the app

## Role-Based Product Entry Points

- Public landing page: `/`
- Public complaint tracking: `/track`
- Citizen auth: `/auth`
- Internal login for worker, leader, and admin users: `/worker-login`
- Citizen workspace: `/citizen`
- Worker workspace: `/worker`
- Leader workspace: `/leader`
- Admin workspace: `/admin`

## Full Working Flow

### 1. Public access and login split

The project uses two different login experiences:

- citizens use `/auth`
- internal staff use `/worker-login`

This keeps public access and internal role access separate. On successful login, the app writes a signed session cookie and routes the user to the correct workspace.

### 2. Citizen complaint submission

From `/citizen/submit`, the citizen fills a government-style complaint form with:

- applicant details
- ward
- department or category
- title and description
- address or landmark
- optional geolocation
- optional previous complaint reference
- optional file attachments

When the form posts to `POST /api/complaints`:

1. the citizen session is validated
2. ward and category values are checked
3. attachments are stored in `data/uploads`
4. a complaint row is inserted
5. an initial complaint timeline update is created
6. a citizen notification is created
7. the complaint is returned immediately
8. background complaint post-processing starts

### 3. Automated routing and triage

After complaint creation, the server runs a complaint pipeline that:

- resolves the most suitable department
- scores sentiment and danger keywords
- calculates frequency and hotspot signals
- flags likely spam
- assigns a priority level
- updates the complaint with department message, routing metadata, and risk scores
- notifies matching department-head users
- notifies admin users
- writes a timeline entry explaining the routing decision

This logic lives mainly in:

- [lib/server/complaints.ts](/d:/smartcrm/lib/server/complaints.ts)
- [lib/server/ai.ts](/d:/smartcrm/lib/server/ai.ts)
- [lib/ai/complaint-intelligence.js](/d:/smartcrm/lib/ai/complaint-intelligence.js)

### 4. Department-head review

Leaders use `/leader` as a department review console.

Their workflow is:

1. filter complaints by status, priority, and ward
2. open one complaint in the review workspace
3. mark it as viewed
4. load workers mapped to the same ward and department
5. assign a worker
6. later verify proof and citizen feedback
7. close the complaint or reopen it for rework

Important rules in the current implementation:

- leaders only see complaints for their own department
- a complaint must be marked viewed before worker assignment
- only workers from the same ward and department are assignable
- final close requires citizen feedback
- a resolved or closed complaint can be reopened for reassignment

### 5. Worker execution flow

Workers use `/worker` and `/worker/updates`.

Their complaint lifecycle is tightly controlled:

- `assigned -> in_progress`
- `in_progress -> resolved`

Workers cannot arbitrarily move complaints across statuses. To resolve a complaint, the worker must submit:

- proof text
- proof image
- optional completion note

On resolution:

- proof is stored
- complaint status becomes `resolved`
- a timeline update is recorded
- citizen gets a notification
- admin users get a notification

### 6. Citizen tracking and feedback

Citizens use `/citizen/tracker?id=<complaint_id>` to see:

- current stage
- administrative timeline
- department message
- assigned worker state
- proof text and proof image
- rating form when complaint is resolved

The tracker also supports PDF export of the complaint record for a more formal report-style view.

After the worker resolves the complaint, the citizen can submit:

- 1 to 5 rating
- optional feedback note

Citizen feedback is stored in `ratings`, appended to the complaint history, and sent to leaders and admin for final review.

### 7. Final closure or reopen

Department head or admin users can finish the lifecycle:

- `resolved -> closed` when citizen feedback exists
- `resolved/closed -> in_progress` if the case needs rework

Reopen clears worker proof-related completion state so the complaint can go back through assignment and execution again.

### 8. Public tracking flow

The public page `/track` accepts a tracking code and returns a safe summary only:

- complaint ID
- current status
- current stage
- department
- last updated time

Private data such as complaint text, attachments, proof image, internal notes, and user identity are intentionally hidden.

If the current logged-in user is the complaint owner, the public route redirects them to the full citizen tracker instead of showing the limited summary.

## Complaint Lifecycle At A Glance

### Main status flow

`submitted -> assigned -> in_progress -> resolved -> closed`

### Supporting actions

- `submitted`: complaint created and routed for department review
- `assigned`: leader has mapped the case to a worker
- `in_progress`: worker has started execution
- `resolved`: worker submitted proof and marked work complete
- `closed`: leader or admin closed the complaint after citizen feedback
- `reopened`: handled by moving a `resolved` or `closed` complaint back to `in_progress`

## Current Pages And Workspaces

### Public and auth

- [app/page.tsx](/d:/smartcrm/app/page.tsx)
- [app/track/page.tsx](/d:/smartcrm/app/track/page.tsx)
- [app/auth/page.tsx](/d:/smartcrm/app/auth/page.tsx)
- [app/worker-login/page.tsx](/d:/smartcrm/app/worker-login/page.tsx)

### Citizen

- [app/citizen/page.tsx](/d:/smartcrm/app/citizen/page.tsx)
- [app/citizen/submit/page.tsx](/d:/smartcrm/app/citizen/submit/page.tsx)
- [app/citizen/my-complaints/page.tsx](/d:/smartcrm/app/citizen/my-complaints/page.tsx)
- [app/citizen/tracker/page.tsx](/d:/smartcrm/app/citizen/tracker/page.tsx)

### Worker

- [app/worker/page.tsx](/d:/smartcrm/app/worker/page.tsx)
- [app/worker/assigned/page.tsx](/d:/smartcrm/app/worker/assigned/page.tsx)
- [app/worker/updates/page.tsx](/d:/smartcrm/app/worker/updates/page.tsx)

### Leader

- [app/leader/page.tsx](/d:/smartcrm/app/leader/page.tsx)
- [app/leader/trends/page.tsx](/d:/smartcrm/app/leader/trends/page.tsx)
- [app/leader/ward-comparison/page.tsx](/d:/smartcrm/app/leader/ward-comparison/page.tsx)
- [app/leader/reports/page.tsx](/d:/smartcrm/app/leader/reports/page.tsx)

### Admin

- [app/admin/page.tsx](/d:/smartcrm/app/admin/page.tsx)
- [app/admin/complaints/page.tsx](/d:/smartcrm/app/admin/complaints/page.tsx)
- [app/admin/analytics/page.tsx](/d:/smartcrm/app/admin/analytics/page.tsx)
- [app/admin/users/page.tsx](/d:/smartcrm/app/admin/users/page.tsx)

## API Overview

### Session and auth

- `POST /api/session/signup`
- `POST /api/session/login`
- `GET /api/session/me`
- `POST /api/session/logout`

### Core data

- `GET /api/wards`
- `GET /api/users`
- `GET /api/notifications`
- `PATCH /api/notifications`

### Complaint APIs

- `GET /api/complaints`
- `POST /api/complaints`
- `GET /api/complaints/[id]`
- `PATCH /api/complaints/[id]`
- `GET /api/complaints/[id]/timeline`
- `GET /api/complaints/[id]/proof`
- `POST /api/complaints/[id]/rating`
- `GET /api/complaints/[id]/assignment`
- `PATCH /api/complaints/[id]/assignment`

### Dashboard and operational APIs

- `GET /api/dashboard/admin`
- `GET /api/dashboard/worker`
- `GET /api/dashboard/leader-trends`
- `GET /api/dashboard/leader-ward-comparison`
- `GET /api/public/complaints/[trackingCode]`
- `GET /api/system/redis-status`

## Important Server Modules

- Auth and role checks: [lib/server/auth.ts](/d:/smartcrm/lib/server/auth.ts)
- Session cookie signing: [lib/server/session.ts](/d:/smartcrm/lib/server/session.ts)
- Auth route handlers: [lib/server/auth-handlers.ts](/d:/smartcrm/lib/server/auth-handlers.ts)
- Complaint lifecycle: [lib/server/complaints.ts](/d:/smartcrm/lib/server/complaints.ts)
- Dashboard summaries: [lib/server/dashboard.ts](/d:/smartcrm/lib/server/dashboard.ts)
- Department trend analytics: [lib/server/leader-trends.ts](/d:/smartcrm/lib/server/leader-trends.ts)
- Notifications: [lib/server/notifications.ts](/d:/smartcrm/lib/server/notifications.ts)
- Upload persistence: [lib/server/uploads.ts](/d:/smartcrm/lib/server/uploads.ts)
- Cache and Redis fallback: [lib/server/complaint-cache.ts](/d:/smartcrm/lib/server/complaint-cache.ts), [lib/server/redis-cache.ts](/d:/smartcrm/lib/server/redis-cache.ts)
- DB query wrapper: [lib/server/db.ts](/d:/smartcrm/lib/server/db.ts)
- Prisma client: [lib/prisma.ts](/d:/smartcrm/lib/prisma.ts)

## Database Model Summary

Main entities in PostgreSQL:

- `users`: citizen, worker, admin, and leader accounts
- `wards`: supported municipal wards
- `workers`: ward and department mapping for worker users
- `complaints`: main grievance record
- `complaint_updates`: timeline and audit history
- `ratings`: citizen closure feedback
- `notifications`: in-app user notifications

The complaint record stores more than basic text. It also keeps:

- routing department
- assigned worker
- priority and risk scores
- hotspot and spam flags
- file attachments
- proof image and proof text
- location fields
- resolution notes
- department review state

Schema reference:

- [prisma/schema.prisma](/d:/smartcrm/prisma/schema.prisma)
- [scripts/setup-db.sql](/d:/smartcrm/scripts/setup-db.sql)

## Uploads, Notifications, And Caching

### Uploads

- citizen attachments and worker proof images are stored on disk under `data/uploads`
- uploaded files are served back through `/api/uploads/local/[id]`

### Notifications

Notifications are created during important lifecycle events such as:

- complaint submission
- department routing
- worker assignment
- work start
- work completion
- citizen feedback
- complaint close
- complaint reopen

### Cache behavior

Complaint summary, proof, timeline, and worker mapping use a short-lived cache.

- if Redis is available, Redis is used
- if Redis is missing or unreachable, the app falls back to in-memory cache

This means the system can still run without Redis, but cache durability is lower in that mode.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Prepare your local runtime config

Set up the required local configuration before running the app. Values are intentionally omitted from this README.

### 3. Prepare the database

You can use either of these approaches:

#### SQL bootstrap

```bash
psql "<your_database_connection>" -f scripts/setup-db.sql
```

#### Prisma migration flow

```bash
npm run prisma:migrate -- --name init
```

### 4. Start the app

```bash
npm run dev
```

Then open:

- citizen portal: `http://localhost:3000/`
- internal login: `http://localhost:3000/worker-login`

## Demo Access

These seeded credentials are useful after running the setup script.

### Citizen

- `citizen@govcrm.demo` / `changeme`

### Admin

- `admin@govcrm.demo` / `changeme`

### Leaders

- `leader.roads@govcrm.demo` / `changeme`
- `leader.water@govcrm.demo` / `changeme`
- `leader.sanitation@govcrm.demo` / `changeme`
- `leader.electricity@govcrm.demo` / `changeme`
- `leader.fire@govcrm.demo` / `changeme`
- `leader.drainage@govcrm.demo` / `changeme`
- `leader.garbage@govcrm.demo` / `changeme`
- `leader.streetlight@govcrm.demo` / `changeme`

### Workers

Workers are seeded by department and ward pattern:

- `worker.<department>.<ward>@govcrm.demo`
- password: `changeme`

Examples:

- `worker.roads.rohini@govcrm.demo`
- `worker.water.dwarka@govcrm.demo`
- `worker.sanitation.saket@govcrm.demo`

Some older generic demo workers are also inserted by the SQL bootstrap for backward compatibility, but the current assignment logic is department plus ward scoped, so the exact worker mapping matters.

## Useful Scripts

- [scripts/setup-db.sql](/d:/smartcrm/scripts/setup-db.sql)
  Database bootstrap, base schema, wards, and seeded demo users
- [scripts/fix-dummy-data.sql](/d:/smartcrm/scripts/fix-dummy-data.sql)
  Data cleanup and alignment script for leader departments, worker mappings, and complaint department normalization

## Validation Commands

```bash
npm run build
```

```bash
npm run prisma:validate
```

If you want stronger validation during development, TypeScript can also be checked with `tsc --noEmit` in the workspace.
