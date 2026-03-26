CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'worker', 'admin', 'leader');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
    CREATE TYPE complaint_status AS ENUM ('submitted', 'received', 'assigned', 'reopened', 'in_progress', 'l1_deadline_missed', 'l2_deadline_missed', 'l3_failed_back_to_l2', 'expired', 'resolved', 'closed', 'rejected');
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
      AND enumlabel = 'reopened'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'reopened' AFTER 'assigned';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'l1_deadline_missed'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'l1_deadline_missed' AFTER 'in_progress';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'l2_deadline_missed'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'l2_deadline_missed' AFTER 'l1_deadline_missed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'l3_failed_back_to_l2'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'l3_failed_back_to_l2' AFTER 'in_progress';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'expired'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'expired' AFTER 'l3_failed_back_to_l2';
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

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_level') THEN
    CREATE TYPE complaint_level AS ENUM ('L1', 'L2', 'L3', 'L2_ESCALATED');
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_level'::regtype
      AND enumlabel = 'L2_ESCALATED'
  ) THEN
    ALTER TYPE complaint_level ADD VALUE 'L2_ESCALATED' AFTER 'L3';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'officer_role') THEN
    CREATE TYPE officer_role AS ENUM ('L1', 'L2', 'L3', 'ADMIN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_history_action') THEN
    CREATE TYPE complaint_history_action AS ENUM ('assigned', 'escalated', 'resolved');
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
  zone_id INTEGER,
  city TEXT NOT NULL DEFAULT 'Delhi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_categories_department_name UNIQUE (department_id, name)
);

CREATE TABLE IF NOT EXISTS officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role officer_role NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
  designation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS officer_mapping (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  l1_officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
  l2_officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
  l3_officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE RESTRICT,
  sla_l1 INTEGER NOT NULL,
  sla_l2 INTEGER NOT NULL,
  sla_l3 INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL,
  action complaint_history_action NOT NULL,
  from_officer UUID,
  to_officer UUID,
  level complaint_level NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department department_name NOT NULL DEFAULT 'roads',
  assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  category complaint_category NOT NULL DEFAULT 'other',
  status complaint_status NOT NULL DEFAULT 'submitted',
  current_level complaint_level NOT NULL DEFAULT 'L1',
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
  proof_image_url TEXT,
  proof_text TEXT,
  work_status TEXT DEFAULT 'Pending',
  department_message TEXT,
  street_address TEXT,
  location_address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wards ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_id TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS department department_name;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_officer_id UUID;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS progress TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS dept_head_viewed BOOLEAN;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS worker_assigned BOOLEAN;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS category_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS current_level complaint_level;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS priority complaint_priority;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_image JSONB;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_images JSONB;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS proof_text TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS work_status TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department department_name;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS department department_name;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS ward_id INTEGER;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE officers o
SET email = COALESCE(u.email, CONCAT('legacy_', LEFT(o.id::text, 8), '@crm.com'))
FROM users u
WHERE o.user_id = u.id
  AND o.email IS NULL;

UPDATE officers
SET email = CONCAT('legacy_', LEFT(id::text, 8), '@crm.com')
WHERE email IS NULL;

UPDATE officers o
SET password = COALESCE(u.password, '123456')
FROM users u
WHERE o.user_id = u.id
  AND o.password IS NULL;

UPDATE officers
SET password = '123456'
WHERE password IS NULL;

UPDATE officers o
SET ward_id = source.ward_id
FROM (
  SELECT officer_id, MIN(ward_id) AS ward_id
  FROM (
    SELECT l1_officer_id AS officer_id, ward_id FROM officer_mapping
    UNION ALL
    SELECT l2_officer_id AS officer_id, ward_id FROM officer_mapping
    UNION ALL
    SELECT l3_officer_id AS officer_id, ward_id FROM officer_mapping
  ) officer_wards
  GROUP BY officer_id
) source
WHERE source.officer_id = o.id
  AND o.ward_id IS NULL;

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
  WHEN status IN ('assigned', 'in_progress', 'resolved', 'closed', 'expired', 'rejected') THEN TRUE
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

UPDATE wards
SET zone_id = CASE name
  WHEN 'Rohini Sector 1' THEN 1
  WHEN 'Rohini Sector 7' THEN 1
  WHEN 'Rohini Sector 16' THEN 1
  WHEN 'Dev Nagar' THEN 2
  WHEN 'Karol Bagh Ward' THEN 2
  WHEN 'Paharganj' THEN 2
  ELSE zone_id
END
WHERE zone_id IS NULL;

UPDATE complaints c
SET zone_id = w.zone_id
FROM wards w
WHERE c.ward_id = w.id
  AND c.zone_id IS NULL;

UPDATE complaints
SET current_level = 'L1'
WHERE current_level IS NULL;

UPDATE complaints
SET priority = 'medium'
WHERE priority IS NULL;

UPDATE complaints
SET priority = 'high'
WHERE priority::text = 'critical';

UPDATE complaints
SET proof_image_url = proof_image->>'url'
WHERE proof_image_url IS NULL
  AND proof_image IS NOT NULL
  AND proof_image ? 'url';

UPDATE complaints
SET work_status = CASE
  WHEN status IN ('resolved', 'closed') THEN 'Awaiting Citizen Feedback'
  WHEN proof_image_url IS NOT NULL OR proof_image IS NOT NULL THEN 'Proof Uploaded'
  WHEN status = 'in_progress' THEN 'Work Started'
  WHEN status = 'assigned' AND current_level = 'L1' THEN 'Pending'
  ELSE 'Pending'
END
WHERE work_status IS NULL;

UPDATE complaints
SET completed_at = COALESCE(resolved_at, updated_at)
WHERE completed_at IS NULL
  AND status IN ('resolved', 'closed');

UPDATE complaints
SET deadline = created_at + INTERVAL '7 days'
WHERE deadline IS NULL;

UPDATE complaints c
SET
  assigned_officer_id = om.l1_officer_id,
  current_level = COALESCE(c.current_level, 'L1'),
  deadline = COALESCE(c.deadline, NOW() + (om.sla_l1 * INTERVAL '1 minute')),
  status = CASE
    WHEN c.status IN ('resolved', 'closed', 'expired', 'rejected') THEN c.status
    ELSE 'assigned'::complaint_status
  END,
  progress = CASE
    WHEN c.status = 'resolved' THEN 'resolved'
    ELSE 'pending'
  END
FROM officer_mapping om
WHERE c.assigned_officer_id IS NULL
  AND c.zone_id = om.zone_id
  AND c.ward_id = om.ward_id
  AND c.department_id = om.department_id
  AND c.category_id = om.category_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'officers'
      AND column_name = 'role'
      AND udt_name = 'complaint_level'
  ) THEN
    ALTER TABLE officers ADD COLUMN role_new officer_role;
    UPDATE officers
    SET role_new = role::text::officer_role;
    ALTER TABLE officers DROP COLUMN role;
    ALTER TABLE officers RENAME COLUMN role_new TO role;
  END IF;
END $$;

ALTER TABLE complaints ALTER COLUMN complaint_id SET NOT NULL;
ALTER TABLE complaints ALTER COLUMN department SET NOT NULL;
ALTER TABLE complaints ALTER COLUMN current_level SET DEFAULT 'L1';
ALTER TABLE complaints ALTER COLUMN priority SET DEFAULT 'medium';
ALTER TABLE complaints ALTER COLUMN priority SET NOT NULL;
ALTER TABLE complaints ALTER COLUMN progress SET DEFAULT 'pending';
ALTER TABLE complaints ALTER COLUMN work_status SET DEFAULT 'Pending';
ALTER TABLE complaints ALTER COLUMN dept_head_viewed SET DEFAULT FALSE;
ALTER TABLE complaints ALTER COLUMN worker_assigned SET DEFAULT FALSE;
ALTER TABLE workers ALTER COLUMN department SET DEFAULT 'roads';
ALTER TABLE officers ALTER COLUMN email SET NOT NULL;
ALTER TABLE officers ALTER COLUMN password SET NOT NULL;
ALTER TABLE officers ALTER COLUMN role SET NOT NULL;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wards_zone_id_fkey'
  ) THEN
    ALTER TABLE wards
    ADD CONSTRAINT wards_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_zone_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_department_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_category_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_assigned_officer_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_assigned_officer_id_fkey
    FOREIGN KEY (assigned_officer_id) REFERENCES officers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'officers_user_id_fkey'
  ) THEN
    ALTER TABLE officers
    ADD CONSTRAINT officers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'officers_ward_id_fkey'
  ) THEN
    ALTER TABLE officers
    ADD CONSTRAINT officers_ward_id_fkey
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaint_history_complaint_id_fkey'
  ) THEN
    ALTER TABLE complaint_history
    ADD CONSTRAINT complaint_history_complaint_id_fkey
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;
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

CREATE TABLE IF NOT EXISTS complaint_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_complaints_zone_id
  ON complaints (zone_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_id
  ON complaints (department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category_id
  ON complaints (category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_officer_id
  ON complaints (assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_current_level_deadline
  ON complaints (current_level, deadline);
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
CREATE INDEX IF NOT EXISTS idx_wards_zone_id
  ON wards (zone_id);
CREATE INDEX IF NOT EXISTS idx_workers_ward_id
  ON workers (ward_id);
CREATE INDEX IF NOT EXISTS idx_workers_ward_department
  ON workers (ward_id, department);
CREATE INDEX IF NOT EXISTS idx_officers_department_role
  ON officers (department_id, role);
CREATE INDEX IF NOT EXISTS idx_officers_zone_id
  ON officers (zone_id);
CREATE INDEX IF NOT EXISTS idx_officers_ward_id
  ON officers (ward_id);
CREATE INDEX IF NOT EXISTS idx_officers_scope_role
  ON officers (zone_id, ward_id, department_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS officers_email_key
  ON officers (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_officer_mapping_lookup
  ON officer_mapping (zone_id, ward_id, department_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_department_id
  ON categories (department_id);
CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint
  ON complaint_updates (complaint_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_proofs_complaint
  ON complaint_proofs (complaint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_uploads_created
  ON file_uploads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_timestamp
  ON complaint_history (complaint_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);

INSERT INTO zones (id, name)
VALUES
  (1, 'Rohini'),
  (2, 'Karol Bagh')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO departments (id, name)
VALUES
  (1, 'Advertisement'),
  (2, 'Cleanliness (Swachhta)'),
  (3, 'Electrical'),
  (4, 'Engineering Works'),
  (5, 'General Branch'),
  (6, 'Horticulture'),
  (7, 'IT Department'),
  (8, 'Parking Cell'),
  (9, 'Public Health'),
  (10, 'Toll Tax'),
  (11, 'Veterinary')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO wards (id, name, zone_id, city)
VALUES
  (1, 'Rohini Sector 1', 1, 'Delhi'),
  (2, 'Rohini Sector 7', 1, 'Delhi'),
  (3, 'Rohini Sector 16', 1, 'Delhi'),
  (4, 'Dev Nagar', 2, 'Delhi'),
  (5, 'Karol Bagh Ward', 2, 'Delhi'),
  (6, 'Paharganj', 2, 'Delhi')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  zone_id = EXCLUDED.zone_id,
  city = EXCLUDED.city;

INSERT INTO categories (id, department_id, name)
VALUES
  (1, 1, 'Dangerous Hoarding'),
  (2, 1, 'Dangerous Unipole'),
  (3, 1, 'Illegal Banner'),
  (4, 1, 'Illegal Hoarding'),
  (5, 1, 'Illegal Unipole'),
  (6, 2, 'Burning of Garbage in Open Space'),
  (7, 2, 'Dead Animals'),
  (8, 2, 'Debris Removal / Construction Material'),
  (9, 2, 'Dustbins Not Cleaned'),
  (10, 2, 'Garbage Dumps'),
  (11, 2, 'Garbage Vehicle Not Arrived'),
  (12, 2, 'Improper Disposal of Fecal Waste / Septage'),
  (13, 2, 'No Electricity in Public Toilets'),
  (14, 2, 'No Water Supply in Public Toilets'),
  (15, 2, 'Non-Sanitary Condition'),
  (16, 2, 'Open Manholes or Drains'),
  (17, 2, 'Public Toilet Blockage'),
  (18, 2, 'Public Toilet(s) Cleaning'),
  (19, 2, 'Sewerage / Storm Water Overflow'),
  (20, 2, 'Stagnant Water on Road'),
  (21, 2, 'Sweeping Not Done'),
  (22, 2, 'Toilet Door Locked'),
  (23, 2, 'Urination in Public / Open Defecation'),
  (24, 3, 'High Mast / Street Lights Not Working'),
  (25, 3, 'Repair Electrical Points'),
  (26, 3, 'Request for New Fans'),
  (27, 3, 'Request for New High Mast / Street Lights'),
  (28, 3, 'Request for New Tube Light'),
  (29, 4, 'Covering of Drain'),
  (30, 4, 'Encroachment on Roads / Footpath / Municipal Land'),
  (31, 4, 'Manhole Cover Level Issue'),
  (32, 4, 'Removal of Malba / Debris'),
  (33, 4, 'Removal of Silt from Road'),
  (34, 4, 'Repair of Open Storm Water Drain'),
  (35, 4, 'Repair of Speed Breaker'),
  (36, 4, 'Replacement of Damaged / Missing Manhole Cover'),
  (37, 4, 'Road / Footpath Resurfacing'),
  (38, 5, 'Any Other Illegality'),
  (39, 5, 'Encroachment on Road by Vehicle'),
  (40, 5, 'End-of-Life Vehicles'),
  (41, 5, 'Illegal Rehdi-Patri / Tehbazari'),
  (42, 5, 'Unauthorized Roadside Parking'),
  (43, 6, 'Cutting of Grass'),
  (44, 6, 'Maintenance of Park'),
  (45, 6, 'Park Booking'),
  (46, 6, 'Park Not Cleaned'),
  (47, 6, 'Removal of Dead / Fallen Tree'),
  (48, 6, 'Repair of Tubewell in Park'),
  (49, 6, 'Trimming / Pruning of Trees'),
  (50, 6, 'Watering of Plants'),
  (51, 7, 'Aadhaar Enrollment Centre Issues'),
  (52, 7, 'Birth & Death Certificate Issues'),
  (53, 7, 'Community Hall Booking & Tehbazari'),
  (54, 7, 'Community Service Department'),
  (55, 7, 'Conversion Parking / Cell Tower'),
  (56, 7, 'Factory License'),
  (57, 7, 'General Trade License'),
  (58, 7, 'Health Trade License'),
  (59, 7, 'LMS (Education / Hawking / School Infra / Hospital Hardware)'),
  (60, 7, 'Property Tax'),
  (61, 7, 'Stationery & Contingency'),
  (62, 7, 'Veterinary Trade License'),
  (63, 8, 'Overcharging in Authorized Parking'),
  (64, 8, 'Parking Area Not Maintained'),
  (65, 8, 'Parking Staff Not in Uniform'),
  (66, 8, 'Unauthorized / Illegal Parking'),
  (67, 9, 'Encroachment by Eateries'),
  (68, 9, 'Illegal Dumping of Medical Waste'),
  (69, 9, 'Illegal Food Hawker'),
  (70, 9, 'Illegal Gym'),
  (71, 9, 'Illegal Slaughtering'),
  (72, 9, 'Improper Transport of Meat / Livestock'),
  (73, 9, 'Roadside Eateries'),
  (74, 9, 'Unauthorized Restaurants'),
  (75, 9, 'Unauthorized Sale of Meat'),
  (76, 10, 'ECC Refund Issue'),
  (77, 10, 'Overcharge Toll Fee'),
  (78, 10, 'Tag Recharge Issue'),
  (79, 10, 'Toll Staff Behavior Issue'),
  (80, 10, 'Wrong Deduction from RFID Tag'),
  (81, 11, 'Catching of Stray Dogs'),
  (82, 11, 'Flies Menace'),
  (83, 11, 'Illegal Dairy'),
  (84, 11, 'Illegal Meat Shop'),
  (85, 11, 'Illegal Slaughtering'),
  (86, 11, 'Injured / Sick Animal'),
  (87, 11, 'Removal of Dead Animal'),
  (88, 11, 'Stray Cattle'),
  (89, 11, 'Stray Monkeys')
ON CONFLICT (id) DO UPDATE
SET
  department_id = EXCLUDED.department_id,
  name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('zones', 'id'), COALESCE((SELECT MAX(id) FROM zones), 1), true);
SELECT setval(pg_get_serial_sequence('departments', 'id'), COALESCE((SELECT MAX(id) FROM departments), 1), true);
SELECT setval(pg_get_serial_sequence('wards', 'id'), COALESCE((SELECT MAX(id) FROM wards), 1), true);
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1), true);

WITH officer_seed AS (
  SELECT *
  FROM (VALUES
    ('Neeraj Gupta', 'L1', 1, NULL::integer, 'Inspector'),
    ('Vikas Mehta', 'L2', 1, NULL::integer, 'AE'),
    ('Rajeev Khanna', 'L3', 1, NULL::integer, 'Manager'),
    ('Amit Sharma', 'L1', 2, NULL::integer, 'JE Civil'),
    ('Ramesh Kumar', 'L1', 2, NULL::integer, 'Sanitary Inspector'),
    ('Suresh Yadav', 'L1', 2, NULL::integer, 'Supervisor'),
    ('Rahul Singh', 'L2', 2, NULL::integer, 'AE Civil'),
    ('Amit Sharma', 'L2', 2, NULL::integer, 'JE'),
    ('Sanjay Verma', 'L3', 2, NULL::integer, 'EE Civil'),
    ('Sunil Kumar', 'L1', 3, NULL::integer, 'Lineman'),
    ('Rahul Singh', 'L2', 3, NULL::integer, 'AE'),
    ('Sanjay Verma', 'L3', 3, NULL::integer, 'EE'),
    ('Amit Sharma', 'L1', 4, NULL::integer, 'JE Civil'),
    ('Rahul Singh', 'L2', 4, NULL::integer, 'AE Civil'),
    ('Sanjay Verma', 'L3', 4, NULL::integer, 'EE Civil'),
    ('Rajesh Gupta', 'L1', 5, NULL::integer, 'Inspector'),
    ('Vikas Mehta', 'L2', 5, NULL::integer, 'AE'),
    ('Rajeev Khanna', 'L3', 5, NULL::integer, 'Manager'),
    ('Ravi Kumar', 'L1', 6, NULL::integer, 'Supervisor'),
    ('Ankit Singh', 'L2', 6, NULL::integer, 'JE'),
    ('Vinod Sharma', 'L3', 6, NULL::integer, 'EE'),
    ('Pooja Arora', 'L1', 7, NULL::integer, 'IT Officer'),
    ('Deepak Jain', 'L2', 7, NULL::integer, 'Manager'),
    ('Anil Kapoor', 'L3', 7, NULL::integer, 'Director'),
    ('Manoj Singh', 'L1', 8, NULL::integer, 'Inspector'),
    ('Ajay Verma', 'L2', 8, NULL::integer, 'Supervisor'),
    ('Rajeev Khanna', 'L3', 8, NULL::integer, 'Manager'),
    ('Dr Arvind', 'L1', 9, NULL::integer, 'Inspector'),
    ('Dr Singh', 'L2', 9, NULL::integer, 'Senior Officer'),
    ('Dr Kapoor', 'L3', 9, NULL::integer, 'Chief Officer'),
    ('Amit Verma', 'L1', 10, NULL::integer, 'Operator'),
    ('Rahul Jain', 'L2', 10, NULL::integer, 'Manager'),
    ('Sanjay Khanna', 'L3', 10, NULL::integer, 'Director'),
    ('Dr Meena', 'L1', 11, NULL::integer, 'Vet Doctor'),
    ('Dr Rajesh', 'L2', 11, NULL::integer, 'Senior Vet'),
    ('Dr Kapoor', 'L3', 11, NULL::integer, 'Chief Vet')
  ) AS seed(name, role, department_id, zone_id, designation)
)
INSERT INTO users (name, email, password, role, phone, department)
SELECT
  seed.name,
  CONCAT(
    'officer.',
    LOWER(seed.role),
    '.',
    REGEXP_REPLACE(LOWER(d.name), '[^a-z0-9]+', '-', 'g'),
    '.',
    REGEXP_REPLACE(LOWER(seed.name), '[^a-z0-9]+', '-', 'g'),
    '@govcrm.demo'
  ),
  'changeme',
  'worker',
  NULL,
  NULL
FROM officer_seed seed
INNER JOIN departments d ON d.id = seed.department_id
ON CONFLICT (email) DO NOTHING;

WITH officer_seed AS (
  SELECT *
  FROM (VALUES
    ('Neeraj Gupta', 'L1', 1, NULL::integer, 'Inspector'),
    ('Vikas Mehta', 'L2', 1, NULL::integer, 'AE'),
    ('Rajeev Khanna', 'L3', 1, NULL::integer, 'Manager'),
    ('Amit Sharma', 'L1', 2, NULL::integer, 'JE Civil'),
    ('Ramesh Kumar', 'L1', 2, NULL::integer, 'Sanitary Inspector'),
    ('Suresh Yadav', 'L1', 2, NULL::integer, 'Supervisor'),
    ('Rahul Singh', 'L2', 2, NULL::integer, 'AE Civil'),
    ('Amit Sharma', 'L2', 2, NULL::integer, 'JE'),
    ('Sanjay Verma', 'L3', 2, NULL::integer, 'EE Civil'),
    ('Sunil Kumar', 'L1', 3, NULL::integer, 'Lineman'),
    ('Rahul Singh', 'L2', 3, NULL::integer, 'AE'),
    ('Sanjay Verma', 'L3', 3, NULL::integer, 'EE'),
    ('Amit Sharma', 'L1', 4, NULL::integer, 'JE Civil'),
    ('Rahul Singh', 'L2', 4, NULL::integer, 'AE Civil'),
    ('Sanjay Verma', 'L3', 4, NULL::integer, 'EE Civil'),
    ('Rajesh Gupta', 'L1', 5, NULL::integer, 'Inspector'),
    ('Vikas Mehta', 'L2', 5, NULL::integer, 'AE'),
    ('Rajeev Khanna', 'L3', 5, NULL::integer, 'Manager'),
    ('Ravi Kumar', 'L1', 6, NULL::integer, 'Supervisor'),
    ('Ankit Singh', 'L2', 6, NULL::integer, 'JE'),
    ('Vinod Sharma', 'L3', 6, NULL::integer, 'EE'),
    ('Pooja Arora', 'L1', 7, NULL::integer, 'IT Officer'),
    ('Deepak Jain', 'L2', 7, NULL::integer, 'Manager'),
    ('Anil Kapoor', 'L3', 7, NULL::integer, 'Director'),
    ('Manoj Singh', 'L1', 8, NULL::integer, 'Inspector'),
    ('Ajay Verma', 'L2', 8, NULL::integer, 'Supervisor'),
    ('Rajeev Khanna', 'L3', 8, NULL::integer, 'Manager'),
    ('Dr Arvind', 'L1', 9, NULL::integer, 'Inspector'),
    ('Dr Singh', 'L2', 9, NULL::integer, 'Senior Officer'),
    ('Dr Kapoor', 'L3', 9, NULL::integer, 'Chief Officer'),
    ('Amit Verma', 'L1', 10, NULL::integer, 'Operator'),
    ('Rahul Jain', 'L2', 10, NULL::integer, 'Manager'),
    ('Sanjay Khanna', 'L3', 10, NULL::integer, 'Director'),
    ('Dr Meena', 'L1', 11, NULL::integer, 'Vet Doctor'),
    ('Dr Rajesh', 'L2', 11, NULL::integer, 'Senior Vet'),
    ('Dr Kapoor', 'L3', 11, NULL::integer, 'Chief Vet')
  ) AS seed(name, role, department_id, zone_id, designation)
)
INSERT INTO officers (user_id, name, email, password, role, department_id, zone_id, ward_id, designation)
SELECT
  u.id,
  seed.name,
  u.email,
  u.password,
  seed.role::officer_role,
  seed.department_id,
  seed.zone_id,
  NULL::integer,
  seed.designation
FROM officer_seed seed
INNER JOIN departments d ON d.id = seed.department_id
INNER JOIN users u
  ON u.email = CONCAT(
    'officer.',
    LOWER(seed.role),
    '.',
    REGEXP_REPLACE(LOWER(d.name), '[^a-z0-9]+', '-', 'g'),
    '.',
    REGEXP_REPLACE(LOWER(seed.name), '[^a-z0-9]+', '-', 'g'),
    '@govcrm.demo'
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM officers existing
  WHERE existing.user_id = u.id
);

WITH default_rules AS (
  SELECT *
  FROM (VALUES
    (1, 'Neeraj Gupta', 'Vikas Mehta', 'Rajeev Khanna', 1, 1, 1),
    (2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (3, 'Sunil Kumar', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (4, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (5, 'Rajesh Gupta', 'Vikas Mehta', 'Rajeev Khanna', 1, 1, 1),
    (6, 'Ravi Kumar', 'Ankit Singh', 'Vinod Sharma', 1, 1, 1),
    (7, 'Pooja Arora', 'Deepak Jain', 'Anil Kapoor', 1, 1, 1),
    (8, 'Manoj Singh', 'Ajay Verma', 'Rajeev Khanna', 1, 1, 1),
    (9, 'Dr Arvind', 'Dr Singh', 'Dr Kapoor', 1, 1, 1),
    (10, 'Amit Verma', 'Rahul Jain', 'Sanjay Khanna', 1, 1, 1),
    (11, 'Dr Meena', 'Dr Rajesh', 'Dr Kapoor', 1, 1, 1)
  ) AS rules(department_id, l1_name, l2_name, l3_name, sla_l1, sla_l2, sla_l3)
),
category_rules AS (
  SELECT *
  FROM (VALUES
    (7, 2, 'Ramesh Kumar', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (9, 2, 'Ramesh Kumar', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (10, 2, 'Ramesh Kumar', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (6, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (11, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (15, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (18, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (22, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (23, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1, 1, 1),
    (8, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (16, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (19, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (20, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (12, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (13, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (14, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (17, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1),
    (21, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1, 1, 1)
  ) AS rules(category_id, department_id, l1_name, l2_name, l3_name, sla_l1, sla_l2, sla_l3)
),
resolved_rules AS (
  SELECT
    c.id AS category_id,
    c.department_id,
    COALESCE(cr.l1_name, dr.l1_name) AS l1_name,
    COALESCE(cr.l2_name, dr.l2_name) AS l2_name,
    COALESCE(cr.l3_name, dr.l3_name) AS l3_name,
    COALESCE(cr.sla_l1, dr.sla_l1) AS sla_l1,
    COALESCE(cr.sla_l2, dr.sla_l2) AS sla_l2,
    COALESCE(cr.sla_l3, dr.sla_l3) AS sla_l3
  FROM categories c
  INNER JOIN default_rules dr ON dr.department_id = c.department_id
  LEFT JOIN category_rules cr ON cr.category_id = c.id
),
mapping_rows AS (
  SELECT
    w.zone_id,
    w.id AS ward_id,
    rr.department_id,
    rr.category_id,
    l1.id AS l1_officer_id,
    l2.id AS l2_officer_id,
    l3.id AS l3_officer_id,
    rr.sla_l1,
    rr.sla_l2,
    rr.sla_l3
  FROM wards w
  INNER JOIN resolved_rules rr ON TRUE
  INNER JOIN officers l1
    ON l1.name = rr.l1_name
   AND l1.role = 'L1'
   AND l1.department_id = rr.department_id
  INNER JOIN officers l2
    ON l2.name = rr.l2_name
   AND l2.role = 'L2'
   AND l2.department_id = rr.department_id
  INNER JOIN officers l3
    ON l3.name = rr.l3_name
   AND l3.role = 'L3'
   AND l3.department_id = rr.department_id
  WHERE w.zone_id IS NOT NULL
)
INSERT INTO officer_mapping (
  zone_id,
  ward_id,
  department_id,
  category_id,
  l1_officer_id,
  l2_officer_id,
  l3_officer_id,
  sla_l1,
  sla_l2,
  sla_l3
)
SELECT
  zone_id,
  ward_id,
  department_id,
  category_id,
  l1_officer_id,
  l2_officer_id,
  l3_officer_id,
  sla_l1,
  sla_l2,
  sla_l3
FROM mapping_rows
ON CONFLICT (zone_id, ward_id, department_id, category_id) DO UPDATE
SET
  l1_officer_id = EXCLUDED.l1_officer_id,
  l2_officer_id = EXCLUDED.l2_officer_id,
  l3_officer_id = EXCLUDED.l3_officer_id,
  sla_l1 = EXCLUDED.sla_l1,
  sla_l2 = EXCLUDED.sla_l2,
  sla_l3 = EXCLUDED.sla_l3;

WITH seeded_users AS (
  INSERT INTO users (name, email, password, role, phone, department)
  VALUES
    ('Citizen Demo', 'citizen@govcrm.demo', 'changeme', 'citizen', '9999000001', NULL),
    ('Rohini Sector 1 Field Officer', 'worker.rohini.sector1@govcrm.demo', 'changeme', 'worker', '9999000002', 'roads'),
    ('Rohini Sector 7 Field Officer', 'worker.rohini.sector7@govcrm.demo', 'changeme', 'worker', '9999000003', 'roads'),
    ('Rohini Sector 16 Field Officer', 'worker.rohini.sector16@govcrm.demo', 'changeme', 'worker', '9999000006', 'roads'),
    ('Dev Nagar Field Officer', 'worker.devnagar@govcrm.demo', 'changeme', 'worker', '9999000007', 'roads'),
    ('Karol Bagh Ward Field Officer', 'worker.karolward@govcrm.demo', 'changeme', 'worker', '9999000008', 'roads'),
    ('Paharganj Field Officer', 'worker.paharganj@govcrm.demo', 'changeme', 'worker', '9999000009', 'roads'),
    ('Control Center Admin', 'admin@govcrm.demo', 'changeme', 'admin', '9999000004', NULL)
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
)
INSERT INTO workers (user_id, ward_id, department)
SELECT users.id, wards.id, 'roads'::department_name
FROM users
JOIN wards
  ON (users.email = 'worker.rohini.sector1@govcrm.demo' AND wards.name = 'Rohini Sector 1')
  OR (users.email = 'worker.rohini.sector7@govcrm.demo' AND wards.name = 'Rohini Sector 7')
  OR (users.email = 'worker.rohini.sector16@govcrm.demo' AND wards.name = 'Rohini Sector 16')
  OR (users.email = 'worker.devnagar@govcrm.demo' AND wards.name = 'Dev Nagar')
  OR (users.email = 'worker.karolward@govcrm.demo' AND wards.name = 'Karol Bagh Ward')
  OR (users.email = 'worker.paharganj@govcrm.demo' AND wards.name = 'Paharganj')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO officers (user_id, name, email, password, role, department_id, zone_id, ward_id, designation)
SELECT
  u.id,
  'System Admin Officer',
  u.email,
  u.password,
  'ADMIN'::officer_role,
  1,
  NULL,
  NULL,
  'Administrator'
FROM users u
WHERE u.email = 'admin@govcrm.demo'
ON CONFLICT (email) DO NOTHING;

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
    ('Rohini Sector 1', 'rohini-sector-1'),
    ('Rohini Sector 7', 'rohini-sector-7'),
    ('Rohini Sector 16', 'rohini-sector-16'),
    ('Dev Nagar', 'dev-nagar'),
    ('Karol Bagh Ward', 'karol-bagh-ward'),
    ('Paharganj', 'paharganj')
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
    ('Rohini Sector 1', 'rohini-sector-1'),
    ('Rohini Sector 7', 'rohini-sector-7'),
    ('Rohini Sector 16', 'rohini-sector-16'),
    ('Dev Nagar', 'dev-nagar'),
    ('Karol Bagh Ward', 'karol-bagh-ward'),
    ('Paharganj', 'paharganj')
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

