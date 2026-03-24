DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'expired'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'expired' AFTER 'l3_failed_back_to_l2';
  END IF;
END $$;
