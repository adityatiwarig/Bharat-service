DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'l2_deadline_missed'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'l2_deadline_missed' AFTER 'l1_deadline_missed';
  END IF;
END $$;
