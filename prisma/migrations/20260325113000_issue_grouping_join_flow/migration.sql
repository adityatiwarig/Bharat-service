CREATE TABLE IF NOT EXISTS issue_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  primary_complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  supporter_count INTEGER NOT NULL DEFAULT 1,
  priority complaint_priority NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS issue_group_id UUID;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS parent_complaint_id UUID;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_issue_group_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_issue_group_id_fkey
    FOREIGN KEY (issue_group_id) REFERENCES issue_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_parent_complaint_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_parent_complaint_id_fkey
    FOREIGN KEY (parent_complaint_id) REFERENCES complaints(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_issue_groups_detection
  ON issue_groups (ward_id, category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_groups_primary_complaint_id
  ON issue_groups (primary_complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_issue_group_id
  ON complaints (issue_group_id);
CREATE INDEX IF NOT EXISTS idx_complaints_parent_complaint_id
  ON complaints (parent_complaint_id);
