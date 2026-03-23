BEGIN;

DELETE FROM users
WHERE role = 'leader'
  AND LOWER(email) = 'leader@govcrm.demo';

DELETE FROM users
WHERE role = 'leader'
  AND LOWER(email) LIKE 'leader.%.%@govcrm.demo';

WITH leader_seed AS (
  SELECT *
  FROM (VALUES
    ('Electricity Dept Head', 'leader.electricity@govcrm.demo', '9999000010', 'electricity'::department_name),
    ('Water Dept Head', 'leader.water@govcrm.demo', '9999000011', 'water'::department_name),
    ('Sanitation Dept Head', 'leader.sanitation@govcrm.demo', '9999000012', 'sanitation'::department_name),
    ('Roads Dept Head', 'leader.roads@govcrm.demo', '9999000013', 'roads'::department_name),
    ('Fire Dept Head', 'leader.fire@govcrm.demo', '9999000014', 'fire'::department_name),
    ('Drainage Dept Head', 'leader.drainage@govcrm.demo', '9999000015', 'drainage'::department_name),
    ('Garbage Dept Head', 'leader.garbage@govcrm.demo', '9999000016', 'garbage'::department_name),
    ('Streetlight Dept Head', 'leader.streetlight@govcrm.demo', '9999000017', 'streetlight'::department_name)
  ) AS leaders(name, email, phone, department)
)
INSERT INTO users (name, email, password, role, phone, department)
SELECT name, email, 'changeme', 'leader', phone, department
FROM leader_seed
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    updated_at = NOW();

UPDATE users
SET department = 'electricity'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'electricity_head@example.com';

UPDATE users
SET department = 'water'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'water_head@example.com';

UPDATE users
SET department = 'sanitation'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'sanitation_head@example.com';

UPDATE users
SET department = 'roads'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'roads_head@example.com';

UPDATE users
SET department = 'fire'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'fire_head@example.com';

UPDATE users
SET department = 'drainage'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'drainage_head@example.com';

UPDATE users
SET department = 'garbage'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'garbage_head@example.com';

UPDATE users
SET department = 'streetlight'::department_name,
    updated_at = NOW()
WHERE role = 'leader'
  AND LOWER(email) = 'streetlight_head@example.com';

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
    department::department_name AS department
  FROM department_seed
  CROSS JOIN ward_seed
)
INSERT INTO users (name, email, password, role, phone, department)
SELECT name, email, password, 'worker', phone, department
FROM worker_seed
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    updated_at = NOW();

WITH worker_email_parts AS (
  SELECT
    u.id AS user_id,
    split_part(split_part(LOWER(u.email), '@', 1), '.', 2) AS token_2,
    split_part(split_part(LOWER(u.email), '@', 1), '.', 3) AS token_3
  FROM users u
  WHERE u.role = 'worker'
),
worker_targets AS (
  SELECT
    user_id,
    CASE
      WHEN token_3 = '' THEN 'roads'::department_name
      WHEN token_2 = 'electricity' THEN 'electricity'::department_name
      WHEN token_2 = 'water' THEN 'water'::department_name
      WHEN token_2 = 'sanitation' THEN 'sanitation'::department_name
      WHEN token_2 = 'roads' THEN 'roads'::department_name
      WHEN token_2 = 'fire' THEN 'fire'::department_name
      WHEN token_2 = 'drainage' THEN 'drainage'::department_name
      WHEN token_2 = 'garbage' THEN 'garbage'::department_name
      WHEN token_2 = 'streetlight' THEN 'streetlight'::department_name
      ELSE NULL
    END AS department,
    CASE
      WHEN token_3 = '' THEN token_2
      ELSE token_3
    END AS ward_token
  FROM worker_email_parts
),
worker_targets_resolved AS (
  SELECT
    wt.user_id,
    wt.department,
    w.id AS ward_id
  FROM worker_targets wt
  INNER JOIN wards w
    ON LOWER(w.name) = CASE
      WHEN wt.ward_token = 'rohini' THEN 'rohini'
      WHEN wt.ward_token = 'dwarka' THEN 'dwarka'
      WHEN wt.ward_token = 'saket' THEN 'saket'
      WHEN wt.ward_token IN ('laxmi', 'laxminagar', 'laxmi_nagar') THEN 'laxmi nagar'
      WHEN wt.ward_token IN ('karol', 'karolbagh', 'karol_bagh') THEN 'karol bagh'
      ELSE LOWER(w.name)
    END
  WHERE wt.department IS NOT NULL
)
UPDATE users u
SET department = wtr.department,
    updated_at = NOW()
FROM worker_targets_resolved wtr
WHERE u.id = wtr.user_id;

WITH worker_email_parts AS (
  SELECT
    u.id AS user_id,
    split_part(split_part(LOWER(u.email), '@', 1), '.', 2) AS token_2,
    split_part(split_part(LOWER(u.email), '@', 1), '.', 3) AS token_3
  FROM users u
  WHERE u.role = 'worker'
),
worker_targets AS (
  SELECT
    user_id,
    CASE
      WHEN token_3 = '' THEN 'roads'::department_name
      WHEN token_2 = 'electricity' THEN 'electricity'::department_name
      WHEN token_2 = 'water' THEN 'water'::department_name
      WHEN token_2 = 'sanitation' THEN 'sanitation'::department_name
      WHEN token_2 = 'roads' THEN 'roads'::department_name
      WHEN token_2 = 'fire' THEN 'fire'::department_name
      WHEN token_2 = 'drainage' THEN 'drainage'::department_name
      WHEN token_2 = 'garbage' THEN 'garbage'::department_name
      WHEN token_2 = 'streetlight' THEN 'streetlight'::department_name
      ELSE NULL
    END AS department,
    CASE
      WHEN token_3 = '' THEN token_2
      ELSE token_3
    END AS ward_token
  FROM worker_email_parts
),
worker_targets_resolved AS (
  SELECT
    wt.user_id,
    wt.department,
    w.id AS ward_id
  FROM worker_targets wt
  INNER JOIN wards w
    ON LOWER(w.name) = CASE
      WHEN wt.ward_token = 'rohini' THEN 'rohini'
      WHEN wt.ward_token = 'dwarka' THEN 'dwarka'
      WHEN wt.ward_token = 'saket' THEN 'saket'
      WHEN wt.ward_token IN ('laxmi', 'laxminagar', 'laxmi_nagar') THEN 'laxmi nagar'
      WHEN wt.ward_token IN ('karol', 'karolbagh', 'karol_bagh') THEN 'karol bagh'
      ELSE LOWER(w.name)
    END
  WHERE wt.department IS NOT NULL
)
INSERT INTO workers (user_id, ward_id, department)
SELECT user_id, ward_id, department
FROM worker_targets_resolved
ON CONFLICT (user_id) DO UPDATE
SET ward_id = EXCLUDED.ward_id,
    department = EXCLUDED.department;

UPDATE complaints
SET department = CASE
  WHEN category = 'streetlight' THEN 'streetlight'::department_name
  WHEN category = 'water' THEN 'water'::department_name
  WHEN category = 'sanitation' THEN 'sanitation'::department_name
  WHEN category = 'drainage' THEN 'drainage'::department_name
  WHEN category = 'sewer' THEN 'drainage'::department_name
  WHEN category = 'waste' THEN 'garbage'::department_name
  WHEN category IN ('pothole', 'encroachment', 'other') THEN 'roads'::department_name
  ELSE COALESCE(department, 'roads'::department_name)
END,
updated_at = NOW()
WHERE department IS NULL
   OR (category = 'streetlight' AND department <> 'streetlight'::department_name)
   OR (category = 'water' AND department <> 'water'::department_name)
   OR (category = 'sanitation' AND department <> 'sanitation'::department_name)
   OR (category IN ('drainage', 'sewer') AND department <> 'drainage'::department_name)
   OR (category = 'waste' AND department <> 'garbage'::department_name)
   OR (category IN ('pothole', 'encroachment', 'other') AND department <> 'roads'::department_name);

COMMIT;
