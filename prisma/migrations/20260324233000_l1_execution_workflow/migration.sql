ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
ADD COLUMN IF NOT EXISTS work_status TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

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

ALTER TABLE complaints
ALTER COLUMN work_status SET DEFAULT 'Pending';
