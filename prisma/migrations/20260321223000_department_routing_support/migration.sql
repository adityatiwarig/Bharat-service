DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_name') THEN
    CREATE TYPE "department_name" AS ENUM (
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
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" "department_name";
ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "department" "department_name" NOT NULL DEFAULT 'roads';
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "complaint_id" TEXT;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "department" "department_name" NOT NULL DEFAULT 'roads';
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "progress" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "dept_head_viewed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "worker_assigned" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "complaints"
SET "complaint_id" = "tracking_code"
WHERE "complaint_id" IS NULL;

UPDATE "complaints"
SET "department" = CASE "category"
  WHEN 'water' THEN 'water'::"department_name"
  WHEN 'streetlight' THEN 'streetlight'::"department_name"
  WHEN 'sanitation' THEN 'sanitation'::"department_name"
  WHEN 'drainage' THEN 'drainage'::"department_name"
  WHEN 'sewer' THEN 'drainage'::"department_name"
  WHEN 'waste' THEN 'garbage'::"department_name"
  ELSE 'roads'::"department_name"
END
WHERE "department" IS NULL;

UPDATE "complaints"
SET "progress" = CASE
  WHEN "status" = 'resolved' THEN 'resolved'
  WHEN "status" = 'in_progress' THEN 'in_progress'
  ELSE 'pending'
END
WHERE "progress" IS NULL;

UPDATE "complaints"
SET "dept_head_viewed" = CASE
  WHEN "status" IN ('assigned', 'in_progress', 'resolved', 'rejected') THEN TRUE
  ELSE FALSE
END
WHERE "dept_head_viewed" IS NULL;

UPDATE "complaints"
SET "worker_assigned" = "assigned_worker_id" IS NOT NULL
WHERE "worker_assigned" IS NULL;

UPDATE "users"
SET "department" = 'roads'::"department_name"
WHERE "role" = 'leader'
  AND "department" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_complaints_complaint_id" ON "complaints"("complaint_id");
CREATE INDEX IF NOT EXISTS "idx_workers_ward_department" ON "workers"("ward_id", "department");
CREATE INDEX IF NOT EXISTS "idx_users_role_department" ON "users"("role", "department");
CREATE INDEX IF NOT EXISTS "idx_complaints_department_ward_status_created"
  ON "complaints"("department", "ward_id", "status", "created_at" DESC);

INSERT INTO "wards" ("name", "city")
VALUES
  ('Rohini', 'Delhi'),
  ('Dwarka', 'Delhi'),
  ('Saket', 'Delhi'),
  ('Laxmi Nagar', 'Delhi'),
  ('Karol Bagh', 'Delhi')
ON CONFLICT ("name") DO NOTHING;
