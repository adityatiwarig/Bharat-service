DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_status'::regtype
      AND enumlabel = 'l3_failed_back_to_l2'
  ) THEN
    ALTER TYPE complaint_status ADD VALUE 'l3_failed_back_to_l2' AFTER 'in_progress';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'complaint_level'::regtype
      AND enumlabel = 'L2_ESCALATED'
  ) THEN
    ALTER TYPE complaint_level ADD VALUE 'L2_ESCALATED' AFTER 'L3';
  END IF;
END $$;
