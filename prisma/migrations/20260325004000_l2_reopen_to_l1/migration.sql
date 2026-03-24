DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'reopened'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'reopened' AFTER 'assigned';
  END IF;
END $$;
