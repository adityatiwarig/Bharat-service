DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'l1_deadline_missed'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'l1_deadline_missed' AFTER 'in_progress';
  END IF;
END $$;
