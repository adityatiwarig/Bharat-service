CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'worker', 'admin', 'leader');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
    CREATE TYPE complaint_status AS ENUM ('received', 'assigned', 'in_progress', 'resolved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_priority') THEN
    CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  category complaint_category NOT NULL DEFAULT 'other',
  status complaint_status NOT NULL DEFAULT 'received',
  priority complaint_priority NOT NULL DEFAULT 'medium',
  risk_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  sentiment_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  frequency_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  hotspot_count INTEGER NOT NULL DEFAULT 0,
  is_hotspot BOOLEAN NOT NULL DEFAULT FALSE,
  is_spam BOOLEAN NOT NULL DEFAULT FALSE,
  spam_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  department_message TEXT,
  location_address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_complaints_user_created
  ON complaints (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_worker
  ON complaints (assigned_worker_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_workers_ward_id
  ON workers (ward_id);
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
  INSERT INTO users (name, email, password, role, phone)
  VALUES
    ('Citizen Demo', 'citizen@govcrm.demo', 'changeme', 'citizen', '9999000001'),
    ('Rohini Field Officer', 'worker.rohini@govcrm.demo', 'changeme', 'worker', '9999000002'),
    ('Dwarka Field Officer', 'worker.dwarka@govcrm.demo', 'changeme', 'worker', '9999000003'),
    ('Saket Field Officer', 'worker.saket@govcrm.demo', 'changeme', 'worker', '9999000006'),
    ('Laxmi Nagar Field Officer', 'worker.laxmi@govcrm.demo', 'changeme', 'worker', '9999000007'),
    ('Karol Bagh Field Officer', 'worker.karol@govcrm.demo', 'changeme', 'worker', '9999000008'),
    ('Control Center Admin', 'admin@govcrm.demo', 'changeme', 'admin', '9999000004'),
    ('Delhi Civic Leader', 'leader@govcrm.demo', 'changeme', 'leader', '9999000005')
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
)
INSERT INTO workers (user_id, ward_id)
SELECT users.id, wards.id
FROM users
JOIN wards
  ON (users.email = 'worker.rohini@govcrm.demo' AND wards.name = 'Rohini')
  OR (users.email = 'worker.dwarka@govcrm.demo' AND wards.name = 'Dwarka')
  OR (users.email = 'worker.saket@govcrm.demo' AND wards.name = 'Saket')
  OR (users.email = 'worker.laxmi@govcrm.demo' AND wards.name = 'Laxmi Nagar')
  OR (users.email = 'worker.karol@govcrm.demo' AND wards.name = 'Karol Bagh')
ON CONFLICT (user_id) DO NOTHING;
