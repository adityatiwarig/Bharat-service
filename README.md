# SmartCRM

SmartCRM is a civic grievance platform built with Next.js, React, Prisma, and PostgreSQL. The current product flow is officer-first: citizens submit complaints, the system classifies and routes them, mapped `L1` officers handle field execution, `L2` and `L3` officers supervise delays and review citizen feedback, and admins monitor the full command view.

The repo still contains older `leader` and `worker` routes for backward compatibility, but the primary internal workflow now runs through `L1`, `L2`, `L3`, and `admin`.

## Current Product Model

- Public landing portal with complaint information, service categories, and ward-wise complaint heatmap
- Citizen auth and dashboard for complaint filing, tracking, proof review, and feedback
- Internal officer login for `L1`, `L2`, `L3`, and `ADMIN`
- Automated complaint classification, priority scoring, hotspot detection, and officer assignment
- SLA-aware escalation workflow with reminders, review desks, and expiry handling
- Admin command center for queue visibility, reports, analytics, and officer roster management

## Main Features

### Citizen-facing

- Public landing page at `/`
- Citizen sign up and login at `/auth`
- Government-style complaint submission form at `/citizen/submit`
- Zone, ward, department, and category based filing
- Optional previous complaint reference
- Camera capture and file upload for complaint photos
- Geo-tagged evidence generation with reverse geocoding support
- Optional live location capture for complaint site coordinates
- Citizen dashboard and searchable complaint history
- Full tracker with status timeline, handling desk, proof images, and citizen feedback
- PDF export of the complaint tracking record
- Public limited tracking page at `/track` using complaint tracking code
- Guided citizen assistant via `/api/chatbot`

### Complaint intelligence and routing

- Department and category normalization during intake
- Risk scoring and priority assignment
- Sentiment and repeat-issue analysis
- Hotspot detection based on recent complaint frequency
- Spam flagging and review messaging
- Automatic mapping to the correct `L1` officer using `zone + ward + department + category`
- Deadline scheduling for `L1`, `L2`, and `L3` review windows

### Officer workflow

- Single internal login page at `/worker-login`
- Officer credentials accepted as login ID or full email
- `L1` field desk for:
  - mark viewed
  - mark on site
  - mark work started
  - upload geo-tagged proof
  - complete work and send for citizen feedback
  - manually forward to `L2` before deadline
- `L2` supervision desk for:
  - monitor `L1` overdue or manually forwarded complaints
  - send reminders to `L1`
  - review citizen feedback
  - close satisfied complaints
  - reopen unsatisfied complaints back to `L1`
- `L3` supervision desk for:
  - monitor `L2` overdue complaints
  - send reminders to `L2`
  - send direct reminders to `L1`
  - take final close or reopen decisions after citizen feedback
- Automatic escalation queue and worker for deadline misses

### Admin-facing

- Live command dashboard at `/admin`
- Complaint queue at `/admin/complaints`
- Analytics and reporting at `/admin/analytics`
- Officer roster and zone coverage view at `/admin/users`
- Level, zone, ward, hotspot, and department breakdowns
- Priority queue monitoring and recent activity feed

### Platform support

- JWT cookie-based sessions
- Role and officer-level guards
- Notifications for citizens, officers, admins, and legacy department heads
- Redis-backed cache and escalation queue with in-memory fallback where applicable
- Local upload serving through `/api/uploads/[storage]/[id]`

## Current End-to-End Flow

### 1. Public entry and authentication

- Citizens use `/auth`
- Internal users use `/worker-login`
- Officer login redirects automatically:
  - `L1 -> /l1`
  - `L2 -> /l2`
  - `L3 -> /l3`
  - `ADMIN -> /admin`

### 2. Citizen complaint submission

Citizens submit a complaint from `/citizen/submit` with:

- applicant details
- zone and ward
- department and category
- title and description
- street or landmark details
- optional previous complaint ID
- optional GPS location
- complaint photos

At submission time the app:

1. validates the citizen session
2. validates zone, ward, department, and category selections
3. stores complaint evidence
4. creates the complaint record
5. generates a public complaint ID and tracking code
6. records the initial timeline entry
7. redirects the citizen to `/citizen/tracker?id=<complaint_id>`

### 3. Automated analysis and initial routing

After creation, the complaint pipeline:

- analyzes complaint text
- normalizes department and category
- computes priority and risk
- checks repeat frequency
- flags hotspot or spam signals
- updates the citizen-facing department message
- resolves the officer mapping
- assigns the complaint to the mapped `L1` officer
- creates notifications and audit entries
- schedules the first SLA deadline

### 4. L1 field execution

`L1` officers work through `/l1` and `/l1/updates`.

Their controlled sequence is:

1. `Viewed by L1`
2. `On Site`
3. `Work Started`
4. `Proof Uploaded`
5. `Awaiting Citizen Feedback`

`L1` can also manually forward an active complaint to `L2` before the deadline, but field execution still remains with `L1`.

### 5. L2 supervision

`L2` officers work through `/l2` and `/l2/updates`.

They do not perform field execution. They:

- supervise manually forwarded `L1` complaints
- supervise complaints whose `L1` deadline has been missed
- send reminders to `L1`
- review citizen feedback after resolution
- close satisfied complaints
- reopen unsatisfied complaints back to fresh `L1` action

### 6. L3 supervision

`L3` officers work through `/l3`.

They supervise complaints whose `L2` review window has been missed. `L3` can:

- send reminders to `L2`
- send direct reminders to `L1`
- take the final close decision on satisfied feedback
- reopen the complaint to `L1` when the citizen is not satisfied

If the complaint is not cleared within the final review window, it can move to `expired`.

### 7. Citizen feedback and final review

Once `L1` completes the work and proof is available:

- the citizen reviews the evidence in `/citizen/tracker`
- the citizen submits rating and feedback
- satisfied feedback routes the complaint to the correct review desk for closure
- unsatisfied feedback routes the complaint to the correct review desk for reopen handling

### 8. Public tracking

The public route `/track` exposes a limited safe summary by tracking code:

- complaint ID
- current status
- current stage
- department
- last updated time

If the logged-in citizen is the owner, the app redirects them to the full tracker instead.

## Lifecycle Snapshot

### Primary internal flow

`submitted -> assigned -> in_progress -> resolved -> closed`

### Supervisory and exception states

- `l1_deadline_missed`
- `l2_deadline_missed`
- `reopened`
- `expired`
- `rejected`

### Review logic

- satisfied feedback is required before final close
- unsatisfied feedback reopens the complaint to `L1`
- automatic deadline processing can move responsibility from `L1` to `L2`, then `L2` to `L3`

## Main Routes

### Public and auth

- `/`
- `/track`
- `/auth`
- `/worker-login`

### Citizen

- `/citizen`
- `/citizen/submit`
- `/citizen/my-complaints`
- `/citizen/tracker`

### Current officer-first workflow

- `/l1`
- `/l1/updates`
- `/l2`
- `/l2/updates`
- `/l3`

### Admin

- `/admin`
- `/admin/complaints`
- `/admin/analytics`
- `/admin/users`

### Legacy compatibility routes

- `/worker`
- `/worker/assigned`
- `/worker/updates`
- `/leader`
- `/leader/reports`
- `/leader/trends`
- `/leader/ward-comparison`

## API Surface

### Session and auth

- `POST /api/session/signup`
- `POST /api/session/login`
- `GET /api/session/me`
- `POST /api/session/logout`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Citizen and complaint APIs

- `GET /api/complaints`
- `POST /api/complaints`
- `GET /api/complaints/my`
- `GET /api/complaints/[id]`
- `GET /api/complaints/[id]/timeline`
- `GET /api/complaints/[id]/proof`
- `POST /api/complaints/[id]/proofs`
- `POST /api/complaints/[id]/rating`
- `GET /api/public/complaints/[trackingCode]`

### Officer workflow APIs

- `PATCH /api/complaints/[id]/l1`
- `PATCH /api/complaints/[id]/review`
- `PATCH /api/complaints/[id]/escalate`
- `GET /api/dashboard/officer`

### Admin and analytics APIs

- `GET /api/dashboard/admin`
- `GET /api/users`
- `GET /api/analytics/ward-heatmap`
- `GET /api/public/wards/distribution`
- `GET /api/notifications`
- `PATCH /api/notifications`

### Utility APIs

- `GET /api/wards`
- `GET /api/grievance-mapping`
- `GET /api/geo/reverse`
- `POST /api/system/escalations/run`
- `GET /api/system/redis-status`
- `POST /api/chatbot`

## Project Structure

- `app/`
  App Router pages, layouts, and route handlers
- `components/`
  Shared UI, dashboards, tracker views, heatmap, and chatbot components
- `components/chatbot/`
  Guided citizen assistant logic and training data
- `lib/server/complaints.ts`
  Complaint lifecycle, tracking, feedback, and intake pipeline
- `lib/server/officer-routing.ts`
  Officer mapping, supervision, reminders, review, and reopen logic
- `lib/server/dashboard.ts`
  Admin, officer, and legacy dashboard summaries
- `lib/server/uploads.ts`
  Complaint evidence and proof storage helpers
- `lib/server/notifications.ts`
  Notification creation and read-state updates
- `lib/server/redis-cache.ts`
  Redis cache and fallback integration
- `lib/server/escalation-queue.ts`
  Escalation deadline scheduling
- `prisma/`
  Prisma schema and migrations
- `scripts/`
  DB bootstrap, officer seeding, and escalation worker scripts

## Database Model Summary

Main tables and models:

- `users`
- `officers`
- `officer_mapping`
- `complaints`
- `complaint_history`
- `complaint_updates`
- `complaint_proofs`
- `ratings`
- `notifications`
- `wards`
- `zones`
- `departments`
- `categories`
- `workers` for legacy worker flow
- `file_uploads`

Schema reference:

- [prisma/schema.prisma](/d:/smartcrm/prisma/schema.prisma)

## Runtime Configuration

### Required

- `DATABASE_URL` or `DIRECT_URL`
- `JWT_SECRET` or `SESSION_SECRET`

### Optional

- `SHADOW_DATABASE_URL` for Prisma migration workflows
- `REDIS_URL` or `REDIS_REST_URL` plus `REDIS_REST_TOKEN`
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` as Redis REST aliases
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Environment values are intentionally not committed to this README.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create local runtime config with the required database and session secret values.

### 3. Run Prisma setup

```bash
npm run prisma:generate
```

```bash
npm run prisma:deploy
```

If you are developing new schema changes locally, use:

```bash
npm run prisma:migrate -- --name <migration_name>
```

### 4. Seed officer mappings

The current officer workflow depends on `officer_mapping` and officer accounts generated from the grievance mapping sheet.

```bash
npm run seed:officers -- full_grievance_mapping_complete.csv.xlsx
```

This generates:

- mapped `L1`, `L2`, `L3`, and `ADMIN` accounts
- `OFFICER_LOGIN_CREDENTIALS.txt`
- default seeded officer password: `123456`

### 5. Start the web app

```bash
npm run dev
```

Open:

- citizen portal: `http://localhost:3000/`
- internal portal: `http://localhost:3000/worker-login`

### 6. Run escalation processing

For SLA automation, run the escalation worker in a separate terminal:

```bash
npm run escalation:worker
```

Or trigger one polling cycle:

```bash
npm run escalation:run-once
```

## Demo and Seeded Access

### Citizen

- create a fresh citizen account from `/auth`

### Officer and admin

- read [OFFICER_LOGIN_CREDENTIALS.txt](/d:/smartcrm/OFFICER_LOGIN_CREDENTIALS.txt)
- login with either `Login ID` or `Email`
- default seeded password: `123456`

The generated file includes:

- officer name
- role
- zone, ward, department, and category scope
- login ID
- full email
- password
- linked user and officer UUIDs

## Legacy Assets Still Present

The repo still contains the older:

- department-head review flow
- worker assignment flow
- legacy worker dashboard
- legacy leader analytics routes
- SQL bootstrap helpers in `scripts/setup-db.sql`

These paths are still useful for compatibility and reference, but the current README and main workflow above reflect the active officer-first architecture.

## Useful Commands

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm run prisma:validate
```

## Key References

- [app/page.tsx](/d:/smartcrm/app/page.tsx)
- [app/citizen/submit/page.tsx](/d:/smartcrm/app/citizen/submit/page.tsx)
- [app/citizen/tracker/page.tsx](/d:/smartcrm/app/citizen/tracker/page.tsx)
- [app/worker-login/page.tsx](/d:/smartcrm/app/worker-login/page.tsx)
- [app/l1/page.tsx](/d:/smartcrm/app/l1/page.tsx)
- [app/l1/updates/page.tsx](/d:/smartcrm/app/l1/updates/page.tsx)
- [app/l2/page.tsx](/d:/smartcrm/app/l2/page.tsx)
- [app/l2/updates/page.tsx](/d:/smartcrm/app/l2/updates/page.tsx)
- [app/l3/page.tsx](/d:/smartcrm/app/l3/page.tsx)
- [app/admin/page.tsx](/d:/smartcrm/app/admin/page.tsx)
- [lib/server/complaints.ts](/d:/smartcrm/lib/server/complaints.ts)
- [lib/server/officer-routing.ts](/d:/smartcrm/lib/server/officer-routing.ts)
- [scripts/seed-officers-from-csv.mjs](/d:/smartcrm/scripts/seed-officers-from-csv.mjs)
- [scripts/escalation-worker.mjs](/d:/smartcrm/scripts/escalation-worker.mjs)
