ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS applicant_name TEXT,
ADD COLUMN IF NOT EXISTS applicant_mobile TEXT,
ADD COLUMN IF NOT EXISTS applicant_email TEXT,
ADD COLUMN IF NOT EXISTS applicant_address TEXT,
ADD COLUMN IF NOT EXISTS applicant_gender TEXT,
ADD COLUMN IF NOT EXISTS previous_complaint_id TEXT;

UPDATE complaints c
SET
  applicant_name = COALESCE(c.applicant_name, u.name),
  applicant_mobile = COALESCE(c.applicant_mobile, u.phone),
  applicant_email = COALESCE(c.applicant_email, u.email)
FROM users u
WHERE u.id = c.user_id
  AND (
    c.applicant_name IS NULL
    OR c.applicant_mobile IS NULL
    OR c.applicant_email IS NULL
  );
