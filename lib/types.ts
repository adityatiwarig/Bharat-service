export type UserRole = 'citizen' | 'worker' | 'admin' | 'leader';
export type ComplaintStatus = 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintCategory = 'pothole' | 'streetlight' | 'water' | 'waste' | 'sanitation' | 'other';

export interface ComplaintAttachment {
  id: string;
  name: string;
  url: string;
  content_type: string;
  size: number;
}

export interface Ward {
  id: number;
  name: string;
  code: string;
  population: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  ward_id?: number;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  tracking_code?: string;
  citizen_id: string;
  citizen_name?: string;
  contact_phone?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  ward_id: number;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  location_accuracy_meters?: number;
  image_url?: string;
  attachments?: ComplaintAttachment[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  updated_by: string;
  old_status?: ComplaintStatus;
  new_status: ComplaintStatus;
  notes?: string;
  created_at: string;
}

export interface KPIMetrics {
  id: number;
  ward_id: number;
  metric_date: string;
  total_complaints: number;
  resolved_complaints: number;
  avg_resolution_time_hours?: number;
  pending_complaints: number;
  created_at: string;
}
