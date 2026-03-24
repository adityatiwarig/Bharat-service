ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS priority complaint_priority;

UPDATE complaints
SET priority = 'medium'
WHERE priority IS NULL;

UPDATE complaints
SET priority = 'high'
WHERE priority::text = 'critical';

ALTER TABLE complaints
ALTER COLUMN priority SET DEFAULT 'medium';

ALTER TABLE complaints
ALTER COLUMN priority SET NOT NULL;
