-- Create enum types
CREATE TYPE user_role AS ENUM ('citizen', 'worker', 'admin', 'leader');
CREATE TYPE complaint_status AS ENUM ('submitted', 'assigned', 'in_progress', 'resolved', 'rejected');
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE complaint_category AS ENUM ('pothole', 'streetlight', 'water', 'waste', 'sanitation', 'other');

-- Wards table (geographic divisions)
CREATE TABLE IF NOT EXISTS wards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  population INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  ward_id INTEGER REFERENCES wards(id),
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category complaint_category NOT NULL,
  status complaint_status DEFAULT 'submitted',
  priority complaint_priority DEFAULT 'medium',
  ward_id INTEGER NOT NULL REFERENCES wards(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

-- Complaint updates/history table
CREATE TABLE IF NOT EXISTS complaint_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES users(id),
  old_status complaint_status,
  new_status complaint_status,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI metrics (pre-calculated for dashboards)
CREATE TABLE IF NOT EXISTS kpi_metrics (
  id SERIAL PRIMARY KEY,
  ward_id INTEGER NOT NULL REFERENCES wards(id),
  metric_date DATE NOT NULL,
  total_complaints INTEGER DEFAULT 0,
  resolved_complaints INTEGER DEFAULT 0,
  avg_resolution_time_hours DECIMAL(10, 2),
  pending_complaints INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ward_id, metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_ward_id ON complaints(ward_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint_id ON complaint_updates(complaint_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users(ward_id);

-- Insert sample wards
INSERT INTO wards (name, code, population) VALUES
  ('Ward 1 - Downtown', 'W1', 15000),
  ('Ward 2 - North District', 'W2', 18000),
  ('Ward 3 - East Side', 'W3', 16500),
  ('Ward 4 - West End', 'W4', 14200),
  ('Ward 5 - South Valley', 'W5', 17500),
  ('Ward 6 - Central Hub', 'W6', 19200)
ON CONFLICT (name) DO NOTHING;
