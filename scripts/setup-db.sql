CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'worker', 'admin', 'leader');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
    CREATE TYPE complaint_status AS ENUM ('submitted', 'received', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected');
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'submitted'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'submitted' BEFORE 'received';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'closed'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'closed' AFTER 'resolved';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_priority') THEN
    CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_name') THEN
    CREATE TYPE department_name AS ENUM (
      'electricity',
      'water',
      'sanitation',
      'roads',
      'fire',
      'drainage',
      'garbage',
      'streetlight'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_category') THEN
    CREATE TYPE complaint_category AS ENUM (
      'pothole',
      'streetlight',
      'water',
      'waste',
      'sanitation',
      'drainage',
      'sewer',
      'encroachment',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS wards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL DEFAULT 'Delhi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'citizen',
  phone TEXT,
  department department_name,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  department department_name NOT NULL DEFAULT 'roads',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT NOT NULL UNIQUE,
  tracking_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  department department_name NOT NULL DEFAULT 'roads',
  assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  category complaint_category NOT NULL DEFAULT 'other',
  status complaint_status NOT NULL DEFAULT 'submitted',
  progress TEXT NOT NULL DEFAULT 'pending' CHECK (progress IN ('pending', 'in_progress', 'resolved')),
  dept_head_viewed BOOLEAN NOT NULL DEFAULT FALSE,
  worker_assigned BOOLEAN NOT NULL DEFAULT FALSE,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  risk_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  sentiment_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  frequency_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  hotspot_count INTEGER NOT NULL DEFAULT 0,
  is_hotspot BOOLEAN NOT NULL DEFAULT FALSE,
  is_spam BOOLEAN NOT NULL DEFAULT FALSE,
  spam_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_image JSONB,
  proof_images JSONB,
  proof_text TEXT,
  department_message TEXT,
  location_address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_id TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS department department_name;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS progress TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS dept_head_viewed BOOLEAN;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS worker_assigned BOOLEAN;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_image JSONB;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_images JSONB;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_text TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department department_name;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS department department_name;

UPDATE complaints
SET complaint_id = tracking_code
WHERE complaint_id IS NULL;

UPDATE complaints
SET department = CASE category
  WHEN 'water' THEN 'water'::department_name
  WHEN 'streetlight' THEN 'streetlight'::department_name
  WHEN 'sanitation' THEN 'sanitation'::department_name
  WHEN 'drainage' THEN 'drainage'::department_name
  WHEN 'sewer' THEN 'drainage'::department_name
  WHEN 'waste' THEN 'garbage'::department_name
  ELSE 'roads'::department_name
END
WHERE department IS NULL;

UPDATE complaints
SET progress = CASE
  WHEN status = 'resolved' THEN 'resolved'
  WHEN status = 'in_progress' THEN 'in_progress'
  ELSE 'pending'
END
WHERE progress IS NULL;

UPDATE complaints
SET dept_head_viewed = CASE
  WHEN status IN ('assigned', 'in_progress', 'resolved', 'closed', 'rejected') THEN TRUE
  ELSE FALSE
END
WHERE dept_head_viewed IS NULL;

UPDATE complaints
SET worker_assigned = assigned_worker_id IS NOT NULL
WHERE worker_assigned IS NULL;

UPDATE users
SET department = CASE
  WHEN role = 'leader' THEN 'roads'::department_name
  ELSE department
END
WHERE department IS NULL;

UPDATE workers
SET department = 'roads'::department_name
WHERE department IS NULL;

ALTER TABLE complaints ALTER COLUMN complaint_id SET NOT NULL;
ALTER TABLE complaints ALTER COLUMN department SET NOT NULL;
ALTER TABLE complaints ALTER COLUMN progress SET DEFAULT 'pending';
ALTER TABLE complaints ALTER COLUMN dept_head_viewed SET DEFAULT FALSE;
ALTER TABLE complaints ALTER COLUMN worker_assigned SET DEFAULT FALSE;
ALTER TABLE workers ALTER COLUMN department SET DEFAULT 'roads';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_progress_check'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_progress_check CHECK (progress IN ('pending', 'in_progress', 'resolved'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS complaint_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status complaint_status NOT NULL,
  note TEXT,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_ward_priority_status_created
  ON complaints (ward_id, priority, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status_created
  ON complaints (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_complaint_id
  ON complaints (complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user_created
  ON complaints (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_worker
  ON complaints (assigned_worker_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_complaints_department_ward_status_created
  ON complaints (department, ward_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_department
  ON users (role, department);
CREATE INDEX IF NOT EXISTS idx_workers_ward_id
  ON workers (ward_id);
CREATE INDEX IF NOT EXISTS idx_workers_ward_department
  ON workers (ward_id, department);
CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint
  ON complaint_updates (complaint_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);

INSERT INTO wards (name, city)
VALUES
  ('Rohini', 'Delhi'),
  ('Dwarka', 'Delhi'),
  ('Saket', 'Delhi'),
  ('Laxmi Nagar', 'Delhi'),
  ('Karol Bagh', 'Delhi')
ON CONFLICT (name) DO NOTHING;

WITH seeded_users AS (
  INSERT INTO users (name, email, password, role, phone, department)
  VALUES
    ('Citizen Demo', 'citizen@govcrm.demo', 'changeme', 'citizen', '9999000001', NULL),
    ('Rohini Field Officer', 'worker.rohini@govcrm.demo', 'changeme', 'worker', '9999000002', 'roads'),
    ('Dwarka Field Officer', 'worker.dwarka@govcrm.demo', 'changeme', 'worker', '9999000003', 'roads'),
    ('Saket Field Officer', 'worker.saket@govcrm.demo', 'changeme', 'worker', '9999000006', 'roads'),
    ('Laxmi Nagar Field Officer', 'worker.laxmi@govcrm.demo', 'changeme', 'worker', '9999000007', 'roads'),
    ('Karol Bagh Field Officer', 'worker.karol@govcrm.demo', 'changeme', 'worker', '9999000008', 'roads'),
    ('Control Center Admin', 'admin@govcrm.demo', 'changeme', 'admin', '9999000004', NULL)
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
)
INSERT INTO workers (user_id, ward_id, department)
SELECT users.id, wards.id, 'roads'::department_name
FROM users
JOIN wards
  ON (users.email = 'worker.rohini@govcrm.demo' AND wards.name = 'Rohini')
  OR (users.email = 'worker.dwarka@govcrm.demo' AND wards.name = 'Dwarka')
  OR (users.email = 'worker.saket@govcrm.demo' AND wards.name = 'Saket')
  OR (users.email = 'worker.laxmi@govcrm.demo' AND wards.name = 'Laxmi Nagar')
  OR (users.email = 'worker.karol@govcrm.demo' AND wards.name = 'Karol Bagh')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO users (name, email, password, role, phone, department)
VALUES
  ('Electricity Dept Head', 'leader.electricity@govcrm.demo', 'changeme', 'leader', '9999000010', 'electricity'),
  ('Water Dept Head', 'leader.water@govcrm.demo', 'changeme', 'leader', '9999000011', 'water'),
  ('Sanitation Dept Head', 'leader.sanitation@govcrm.demo', 'changeme', 'leader', '9999000012', 'sanitation'),
  ('Roads Dept Head', 'leader.roads@govcrm.demo', 'changeme', 'leader', '9999000013', 'roads'),
  ('Fire Dept Head', 'leader.fire@govcrm.demo', 'changeme', 'leader', '9999000014', 'fire'),
  ('Drainage Dept Head', 'leader.drainage@govcrm.demo', 'changeme', 'leader', '9999000015', 'drainage'),
  ('Garbage Dept Head', 'leader.garbage@govcrm.demo', 'changeme', 'leader', '9999000016', 'garbage'),
  ('Streetlight Dept Head', 'leader.streetlight@govcrm.demo', 'changeme', 'leader', '9999000017', 'streetlight')
ON CONFLICT (email) DO NOTHING;
WITH department_seed AS (
  SELECT *
  FROM (VALUES
    ('electricity', 'Electricity'),
    ('water', 'Water'),
    ('sanitation', 'Sanitation'),
    ('roads', 'Roads'),
    ('fire', 'Fire'),
    ('drainage', 'Drainage'),
    ('garbage', 'Garbage'),
    ('streetlight', 'Streetlight')
  ) AS departments(department, department_label)
),
ward_seed AS (
  SELECT *
  FROM (VALUES
    ('Rohini', 'rohini'),
    ('Dwarka', 'dwarka'),
    ('Saket', 'saket'),
    ('Laxmi Nagar', 'laxmi'),
    ('Karol Bagh', 'karol')
  ) AS wards(ward_name, ward_slug)
),
worker_seed AS (
  SELECT
    CONCAT(department_label, ' ', ward_name, ' Worker') AS name,
    CONCAT('worker.', department, '.', ward_slug, '@govcrm.demo') AS email,
    'changeme' AS password,
    CONCAT('99991', LPAD(ROW_NUMBER() OVER (ORDER BY department, ward_name)::text, 5, '0')) AS phone,
    department::department_name AS department,
    ward_name
  FROM department_seed
  CROSS JOIN ward_seed
)
INSERT INTO users (name, email, password, role, phone, department)
SELECT name, email, password, 'worker', phone, department
FROM worker_seed
ON CONFLICT (email) DO NOTHING;

WITH department_seed AS (
  SELECT *
  FROM (VALUES
    ('electricity'),
    ('water'),
    ('sanitation'),
    ('roads'),
    ('fire'),
    ('drainage'),
    ('garbage'),
    ('streetlight')
  ) AS departments(department)
),
ward_seed AS (
  SELECT *
  FROM (VALUES
    ('Rohini', 'rohini'),
    ('Dwarka', 'dwarka'),
    ('Saket', 'saket'),
    ('Laxmi Nagar', 'laxmi'),
    ('Karol Bagh', 'karol')
  ) AS wards(ward_name, ward_slug)
),
worker_seed AS (
  SELECT
    CONCAT('worker.', department, '.', ward_slug, '@govcrm.demo') AS email,
    department::department_name AS department,
    ward_name
  FROM department_seed
  CROSS JOIN ward_seed
)
INSERT INTO workers (user_id, ward_id, department)
SELECT u.id, w.id, worker_seed.department
FROM worker_seed
INNER JOIN users u ON u.email = worker_seed.email
INNER JOIN wards w ON w.name = worker_seed.ward_name
ON CONFLICT (user_id) DO NOTHING;

