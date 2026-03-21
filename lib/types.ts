export type UserRole = 'citizen' | 'worker' | 'admin' | 'leader';

export type ComplaintStatus =
  | 'received'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'submitted';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';

export type ComplaintCategory =
  | 'pothole'
  | 'streetlight'
  | 'water'
  | 'waste'
  | 'sanitation'
  | 'drainage'
  | 'sewer'
  | 'encroachment'
  | 'other';

export interface Ward {
  id: number;
  name: string;
  city: string;
  code?: string;
  population?: number;
  created_at?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ward_id?: number | null;
}

export interface User extends UserSession {
  password?: string;
  full_name?: string;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  user_id: string;
  ward_id: number;
  created_at: string;
  user?: User;
  ward?: Ward;
}

export interface ComplaintAttachment {
  id: string;
  name: string;
  url: string;
  content_type: string;
  size: number;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note?: string | null;
  updated_at: string;
  updated_by_user_id?: string | null;
  updated_by_name?: string | null;
}

export interface Rating {
  id: string;
  complaint_id: string;
  rating: number;
  feedback?: string | null;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  complaint_id?: string | null;
  title: string;
  message: string;
  href?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Complaint {
  id: string;
  tracking_code: string;
  user_id: string;
  citizen_id?: string;
  ward_id: number;
  title: string;
  text: string;
  description?: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  risk_score: number;
  sentiment_score?: number;
  frequency_score?: number;
  hotspot_count?: number;
  is_hotspot?: boolean;
  is_spam?: boolean;
  spam_reasons?: string[];
  department_message?: string;
  location_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  attachments?: ComplaintAttachment[];
  assigned_worker_id?: string | null;
  assigned_to?: string | null;
  ward_name?: string;
  citizen_name?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  updates?: ComplaintUpdate[];
  rating?: Rating | null;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ComplaintListFilters {
  page?: number;
  page_size?: number;
  q?: string;
  status?: ComplaintStatus | 'all';
  priority?: ComplaintPriority | 'all';
  ward_id?: number;
  category?: ComplaintCategory | 'all';
  my_assigned?: boolean;
  mine?: boolean;
}

export interface ComplaintAnalyticsSummary {
  total_complaints: number;
  high_priority_count: number;
  resolution_rate: number;
  category_breakdown: Array<{ category: ComplaintCategory; count: number }>;
  top_urgent_issues: Complaint[];
  most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
  hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
}

export interface WorkerDashboardSummary {
  assigned_total: number;
  assigned_open: number;
  in_progress: number;
  resolved: number;
  urgent_queue: number;
  items: Complaint[];
}
