ALTER TABLE officers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE officers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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
  ) AS email,
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
INSERT INTO officers (user_id, name, role, department_id, zone_id, designation, email, password)
SELECT
  u.id,
  seed.name,
  seed.role::officer_role,
  seed.department_id,
  seed.zone_id,
  seed.designation,
  u.email,
  COALESCE(u.password, '123456')
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
ON CONFLICT (user_id) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id,
  zone_id = EXCLUDED.zone_id,
  designation = EXCLUDED.designation,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  updated_at = NOW();

WITH default_rules AS (
  SELECT *
  FROM (VALUES
    (1, 'Neeraj Gupta', 'Vikas Mehta', 'Rajeev Khanna', 1440, 1440, 1440),
    (2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (3, 'Sunil Kumar', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (4, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (5, 'Rajesh Gupta', 'Vikas Mehta', 'Rajeev Khanna', 1440, 1440, 1440),
    (6, 'Ravi Kumar', 'Ankit Singh', 'Vinod Sharma', 1440, 1440, 1440),
    (7, 'Pooja Arora', 'Deepak Jain', 'Anil Kapoor', 1440, 1440, 1440),
    (8, 'Manoj Singh', 'Ajay Verma', 'Rajeev Khanna', 1440, 1440, 1440),
    (9, 'Dr Arvind', 'Dr Singh', 'Dr Kapoor', 1440, 1440, 1440),
    (10, 'Amit Verma', 'Rahul Jain', 'Sanjay Khanna', 1440, 1440, 1440),
    (11, 'Dr Meena', 'Dr Rajesh', 'Dr Kapoor', 1440, 1440, 1440)
  ) AS rules(department_id, l1_name, l2_name, l3_name, sla_l1, sla_l2, sla_l3)
),
category_rules AS (
  SELECT *
  FROM (VALUES
    (7, 2, 'Ramesh Kumar', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (9, 2, 'Ramesh Kumar', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (10, 2, 'Ramesh Kumar', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (6, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (11, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (15, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (18, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (22, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (23, 2, 'Suresh Yadav', 'Amit Sharma', 'Sanjay Verma', 1440, 1440, 1440),
    (8, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (16, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (19, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (20, 2, 'Amit Sharma', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (12, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (13, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (14, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (17, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440),
    (21, 2, 'Suresh Yadav', 'Rahul Singh', 'Sanjay Verma', 1440, 1440, 1440)
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
canonical_officers AS (
  SELECT
    department_id,
    role,
    name,
    MIN(id::text)::uuid AS officer_id
  FROM officers
  GROUP BY department_id, role, name
),
mapping_rows AS (
  SELECT
    w.zone_id,
    w.id AS ward_id,
    rr.department_id,
    rr.category_id,
    l1.officer_id AS l1_officer_id,
    l2.officer_id AS l2_officer_id,
    l3.officer_id AS l3_officer_id,
    rr.sla_l1,
    rr.sla_l2,
    rr.sla_l3
  FROM wards w
  INNER JOIN resolved_rules rr ON TRUE
  INNER JOIN canonical_officers l1
    ON l1.name = rr.l1_name
   AND l1.role = 'L1'
   AND l1.department_id = rr.department_id
  INNER JOIN canonical_officers l2
    ON l2.name = rr.l2_name
   AND l2.role = 'L2'
   AND l2.department_id = rr.department_id
  INNER JOIN canonical_officers l3
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

UPDATE complaints c
SET
  assigned_officer_id = om.l1_officer_id,
  current_level = COALESCE(c.current_level, 'L1'),
  deadline = COALESCE(c.deadline, NOW() + (om.sla_l1 * INTERVAL '1 minute')),
  status = CASE
    WHEN c.status IN ('resolved', 'closed', 'rejected') THEN c.status
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

INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
SELECT
  c.id,
  'assigned'::complaint_history_action,
  NULL,
  c.assigned_officer_id,
  COALESCE(c.current_level, 'L1')::complaint_level
FROM complaints c
WHERE c.assigned_officer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM complaint_history h
    WHERE h.complaint_id = c.id
      AND h.action = 'assigned'
  );


