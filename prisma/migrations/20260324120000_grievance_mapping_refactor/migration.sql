DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_level') THEN
    CREATE TYPE complaint_level AS ENUM ('L1', 'L2', 'L3');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_categories_department_name UNIQUE (department_id, name)
);

ALTER TABLE wards ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS category_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS current_level complaint_level;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wards_zone_id_fkey'
  ) THEN
    ALTER TABLE wards
    ADD CONSTRAINT wards_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_zone_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_zone_id_fkey
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_department_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'complaints_category_id_fkey'
  ) THEN
    ALTER TABLE complaints
    ADD CONSTRAINT complaints_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wards_zone_id
  ON wards (zone_id);
CREATE INDEX IF NOT EXISTS idx_categories_department_id
  ON categories (department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_zone_id
  ON complaints (zone_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_id
  ON complaints (department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category_id
  ON complaints (category_id);

INSERT INTO zones (id, name)
VALUES
  (1, 'Rohini'),
  (2, 'Karol Bagh')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO departments (id, name)
VALUES
  (1, 'Advertisement'),
  (2, 'Cleanliness (Swachhta)'),
  (3, 'Electrical'),
  (4, 'Engineering Works'),
  (5, 'General Branch'),
  (6, 'Horticulture'),
  (7, 'IT Department'),
  (8, 'Parking Cell'),
  (9, 'Public Health'),
  (10, 'Toll Tax'),
  (11, 'Veterinary')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO wards (id, name, zone_id, city)
VALUES
  (1, 'Rohini Sector 1', 1, 'Delhi'),
  (2, 'Rohini Sector 7', 1, 'Delhi'),
  (3, 'Rohini Sector 16', 1, 'Delhi'),
  (4, 'Dev Nagar', 2, 'Delhi'),
  (5, 'Karol Bagh Ward', 2, 'Delhi'),
  (6, 'Paharganj', 2, 'Delhi')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  zone_id = EXCLUDED.zone_id,
  city = EXCLUDED.city;

INSERT INTO categories (id, department_id, name)
VALUES
  (1, 1, 'Dangerous Hoarding'),
  (2, 1, 'Dangerous Unipole'),
  (3, 1, 'Illegal Banner'),
  (4, 1, 'Illegal Hoarding'),
  (5, 1, 'Illegal Unipole'),
  (6, 2, 'Burning of Garbage in Open Space'),
  (7, 2, 'Dead Animals'),
  (8, 2, 'Debris Removal / Construction Material'),
  (9, 2, 'Dustbins Not Cleaned'),
  (10, 2, 'Garbage Dumps'),
  (11, 2, 'Garbage Vehicle Not Arrived'),
  (12, 2, 'Improper Disposal of Fecal Waste / Septage'),
  (13, 2, 'No Electricity in Public Toilets'),
  (14, 2, 'No Water Supply in Public Toilets'),
  (15, 2, 'Non-Sanitary Condition'),
  (16, 2, 'Open Manholes or Drains'),
  (17, 2, 'Public Toilet Blockage'),
  (18, 2, 'Public Toilet(s) Cleaning'),
  (19, 2, 'Sewerage / Storm Water Overflow'),
  (20, 2, 'Stagnant Water on Road'),
  (21, 2, 'Sweeping Not Done'),
  (22, 2, 'Toilet Door Locked'),
  (23, 2, 'Urination in Public / Open Defecation'),
  (24, 3, 'High Mast / Street Lights Not Working'),
  (25, 3, 'Repair Electrical Points'),
  (26, 3, 'Request for New Fans'),
  (27, 3, 'Request for New High Mast / Street Lights'),
  (28, 3, 'Request for New Tube Light'),
  (29, 4, 'Covering of Drain'),
  (30, 4, 'Encroachment on Roads / Footpath / Municipal Land'),
  (31, 4, 'Manhole Cover Level Issue'),
  (32, 4, 'Removal of Malba / Debris'),
  (33, 4, 'Removal of Silt from Road'),
  (34, 4, 'Repair of Open Storm Water Drain'),
  (35, 4, 'Repair of Speed Breaker'),
  (36, 4, 'Replacement of Damaged / Missing Manhole Cover'),
  (37, 4, 'Road / Footpath Resurfacing'),
  (38, 5, 'Any Other Illegality'),
  (39, 5, 'Encroachment on Road by Vehicle'),
  (40, 5, 'End-of-Life Vehicles'),
  (41, 5, 'Illegal Rehdi-Patri / Tehbazari'),
  (42, 5, 'Unauthorized Roadside Parking'),
  (43, 6, 'Cutting of Grass'),
  (44, 6, 'Maintenance of Park'),
  (45, 6, 'Park Booking'),
  (46, 6, 'Park Not Cleaned'),
  (47, 6, 'Removal of Dead / Fallen Tree'),
  (48, 6, 'Repair of Tubewell in Park'),
  (49, 6, 'Trimming / Pruning of Trees'),
  (50, 6, 'Watering of Plants'),
  (51, 7, 'Aadhaar Enrollment Centre Issues'),
  (52, 7, 'Birth & Death Certificate Issues'),
  (53, 7, 'Community Hall Booking & Tehbazari'),
  (54, 7, 'Community Service Department'),
  (55, 7, 'Conversion Parking / Cell Tower'),
  (56, 7, 'Factory License'),
  (57, 7, 'General Trade License'),
  (58, 7, 'Health Trade License'),
  (59, 7, 'LMS (Education / Hawking / School Infra / Hospital Hardware)'),
  (60, 7, 'Property Tax'),
  (61, 7, 'Stationery & Contingency'),
  (62, 7, 'Veterinary Trade License'),
  (63, 8, 'Overcharging in Authorized Parking'),
  (64, 8, 'Parking Area Not Maintained'),
  (65, 8, 'Parking Staff Not in Uniform'),
  (66, 8, 'Unauthorized / Illegal Parking'),
  (67, 9, 'Encroachment by Eateries'),
  (68, 9, 'Illegal Dumping of Medical Waste'),
  (69, 9, 'Illegal Food Hawker'),
  (70, 9, 'Illegal Gym'),
  (71, 9, 'Illegal Slaughtering'),
  (72, 9, 'Improper Transport of Meat / Livestock'),
  (73, 9, 'Roadside Eateries'),
  (74, 9, 'Unauthorized Restaurants'),
  (75, 9, 'Unauthorized Sale of Meat'),
  (76, 10, 'ECC Refund Issue'),
  (77, 10, 'Overcharge Toll Fee'),
  (78, 10, 'Tag Recharge Issue'),
  (79, 10, 'Toll Staff Behavior Issue'),
  (80, 10, 'Wrong Deduction from RFID Tag'),
  (81, 11, 'Catching of Stray Dogs'),
  (82, 11, 'Flies Menace'),
  (83, 11, 'Illegal Dairy'),
  (84, 11, 'Illegal Meat Shop'),
  (85, 11, 'Illegal Slaughtering'),
  (86, 11, 'Injured / Sick Animal'),
  (87, 11, 'Removal of Dead Animal'),
  (88, 11, 'Stray Cattle'),
  (89, 11, 'Stray Monkeys')
ON CONFLICT (id) DO UPDATE
SET
  department_id = EXCLUDED.department_id,
  name = EXCLUDED.name;

SELECT setval(pg_get_serial_sequence('zones', 'id'), COALESCE((SELECT MAX(id) FROM zones), 1), true);
SELECT setval(pg_get_serial_sequence('departments', 'id'), COALESCE((SELECT MAX(id) FROM departments), 1), true);
SELECT setval(pg_get_serial_sequence('wards', 'id'), COALESCE((SELECT MAX(id) FROM wards), 1), true);
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1), true);

UPDATE wards
SET zone_id = CASE name
  WHEN 'Rohini Sector 1' THEN 1
  WHEN 'Rohini Sector 7' THEN 1
  WHEN 'Rohini Sector 16' THEN 1
  WHEN 'Dev Nagar' THEN 2
  WHEN 'Karol Bagh Ward' THEN 2
  WHEN 'Paharganj' THEN 2
  ELSE zone_id
END
WHERE zone_id IS NULL;

UPDATE complaints c
SET zone_id = w.zone_id
FROM wards w
WHERE c.ward_id = w.id
  AND c.zone_id IS NULL;

UPDATE complaints
SET current_level = 'L1'
WHERE current_level IS NULL;

UPDATE complaints
SET deadline = created_at + INTERVAL '7 days'
WHERE deadline IS NULL;

