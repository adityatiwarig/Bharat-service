DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'closed'
  ) THEN
    ALTER TYPE "complaint_status" ADD VALUE 'closed' AFTER 'resolved';
  END IF;
END $$;
