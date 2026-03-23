DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'officer_role') THEN
    CREATE TYPE officer_role AS ENUM ('L1', 'L2', 'L3', 'ADMIN');
  END IF;
END $$;

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

ALTER TABLE officers ALTER COLUMN email SET NOT NULL;
ALTER TABLE officers ALTER COLUMN password SET NOT NULL;
ALTER TABLE officers ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'officers_ward_id_fkey'
  ) THEN
    ALTER TABLE officers
    ADD CONSTRAINT officers_ward_id_fkey
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS officers_email_key ON officers (email);
CREATE INDEX IF NOT EXISTS idx_officers_ward_id ON officers (ward_id);
CREATE INDEX IF NOT EXISTS idx_officers_scope_role ON officers (zone_id, ward_id, department_id, role);

UPDATE officer_mapping
SET
  sla_l1 = CASE WHEN sla_l1 > 30 THEN GREATEST(1, CEIL(sla_l1 / 1440.0)::int) ELSE sla_l1 END,
  sla_l2 = CASE WHEN sla_l2 > 30 THEN GREATEST(1, CEIL(sla_l2 / 1440.0)::int) ELSE sla_l2 END,
  sla_l3 = CASE WHEN sla_l3 > 30 THEN GREATEST(1, CEIL(sla_l3 / 1440.0)::int) ELSE sla_l3 END;
