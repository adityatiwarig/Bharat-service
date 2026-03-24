WITH mapping_targets AS (
  SELECT
    om.id,
    om.zone_id,
    om.ward_id,
    om.department_id,
    om.category_id,
    COALESCE(l1.id, om.l1_officer_id) AS l1_officer_id,
    COALESCE(l2.id, om.l2_officer_id) AS l2_officer_id,
    COALESCE(l3.id, om.l3_officer_id) AS l3_officer_id,
    CASE WHEN om.sla_l1 < 60 THEN om.sla_l1 * 1440 ELSE om.sla_l1 END AS sla_l1,
    CASE WHEN om.sla_l2 < 60 THEN om.sla_l2 * 1440 ELSE om.sla_l2 END AS sla_l2,
    CASE WHEN om.sla_l3 < 60 THEN om.sla_l3 * 1440 ELSE om.sla_l3 END AS sla_l3
  FROM officer_mapping om
  INNER JOIN wards w ON w.id = om.ward_id
  INNER JOIN departments d ON d.id = om.department_id
  INNER JOIN categories c ON c.id = om.category_id
  LEFT JOIN officers l1
    ON LOWER(SPLIT_PART(l1.email, '@', 1)) = CONCAT(
      'l1_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(w.name), '[^a-z0-9]+', '_', 'g')), 18),
      '_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(d.name), '[^a-z0-9]+', '_', 'g')), 18),
      '_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(c.name), '[^a-z0-9]+', '_', 'g')), 18)
    )
  LEFT JOIN officers l2
    ON LOWER(SPLIT_PART(l2.email, '@', 1)) = CONCAT(
      'l2_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(w.name), '[^a-z0-9]+', '_', 'g')), 18),
      '_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(d.name), '[^a-z0-9]+', '_', 'g')), 18),
      '_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(c.name), '[^a-z0-9]+', '_', 'g')), 18)
    )
  LEFT JOIN officers l3
    ON LOWER(SPLIT_PART(l3.email, '@', 1)) = CONCAT(
      'l3_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(w.name), '[^a-z0-9]+', '_', 'g')), 18),
      '_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(d.name), '[^a-z0-9]+', '_', 'g')), 18),
      '_',
      LEFT(TRIM(BOTH '_' FROM REGEXP_REPLACE(LOWER(c.name), '[^a-z0-9]+', '_', 'g')), 18)
    )
)
UPDATE officer_mapping om
SET
  l1_officer_id = mt.l1_officer_id,
  l2_officer_id = mt.l2_officer_id,
  l3_officer_id = mt.l3_officer_id,
  sla_l1 = mt.sla_l1,
  sla_l2 = mt.sla_l2,
  sla_l3 = mt.sla_l3
FROM mapping_targets mt
WHERE om.id = mt.id;

WITH repaired_mapping AS (
  SELECT
    zone_id,
    ward_id,
    department_id,
    category_id,
    l1_officer_id,
    l2_officer_id,
    l3_officer_id
  FROM officer_mapping
)
UPDATE complaints c
SET
  assigned_officer_id = CASE
    WHEN c.current_level = 'L1' THEN rm.l1_officer_id
    WHEN c.current_level IN ('L2', 'L2_ESCALATED') THEN rm.l2_officer_id
    WHEN c.current_level = 'L3' THEN rm.l3_officer_id
    ELSE c.assigned_officer_id
  END,
  updated_at = CASE
    WHEN c.assigned_officer_id IS DISTINCT FROM CASE
      WHEN c.current_level = 'L1' THEN rm.l1_officer_id
      WHEN c.current_level IN ('L2', 'L2_ESCALATED') THEN rm.l2_officer_id
      WHEN c.current_level = 'L3' THEN rm.l3_officer_id
      ELSE c.assigned_officer_id
    END THEN NOW()
    ELSE c.updated_at
  END
FROM repaired_mapping rm
WHERE c.zone_id = rm.zone_id
  AND c.ward_id = rm.ward_id
  AND c.department_id = rm.department_id
  AND c.category_id = rm.category_id
  AND c.status NOT IN ('closed', 'rejected', 'expired')
  AND (
    (c.current_level = 'L1' AND rm.l1_officer_id IS NOT NULL)
    OR (c.current_level IN ('L2', 'L2_ESCALATED') AND rm.l2_officer_id IS NOT NULL)
    OR (c.current_level = 'L3' AND rm.l3_officer_id IS NOT NULL)
  );
