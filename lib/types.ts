export type UserRole = 'citizen' | 'worker' | 'admin' | 'leader';
export type AuthSource = 'user' | 'officer';

export type ComplaintStatus =
  | 'submitted'
  | 'received'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'rejected';

export type ComplaintProgress = 'pending' | 'in_progress' | 'resolved';
export type ComplaintDepartment =
  | 'electricity'
  | 'water'
  | 'sanitation'
  | 'roads'
  | 'fire'
  | 'drainage'
  | 'garbage'
  | 'streetlight';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';
export type OfficerLevel = 'L1' | 'L2' | 'L3';
export type OfficerRole = OfficerLevel | 'ADMIN';
export type ComplaintHistoryAction = 'assigned' | 'escalated' | 'resolved';

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
  zone_id?: number | null;
  zone_name?: string | null;
  code?: string;
  population?: number;
  created_at?: string;
}

export interface Zone {
  id: number;
  name: string;
}

export interface GrievanceDepartmentOption {
  id: number;
  name: string;
}

export interface GrievanceCategoryOption {
  id: number;
  name: string;
  department_id: number;
}

export interface GrievanceMappingResponse {
  source_file: string;
  zones: Zone[];
  wards: Ward[];
  departments: GrievanceDepartmentOption[];
  categories: GrievanceCategoryOption[];
  relationships: {
    wards_by_zone: Record<string, number[]>;
    categories_by_department: Record<string, number[]>;
  };
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  auth_source?: AuthSource;
  phone?: string | null;
  ward_id?: number | null;
  department?: ComplaintDepartment | null;
  officer_id?: string | null;
  officer_level?: OfficerLevel | null;
  officer_role?: OfficerRole | null;
  officer_department_id?: number | null;
  officer_department_name?: string | null;
  officer_zone_id?: number | null;
  officer_ward_id?: number | null;
  redirect_to?: string;
}

export interface User extends UserSession {
  password?: string;
  full_name?: string;
  phone?: string | null;
  ward_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  user_id: string;
  ward_id: number;
  department: ComplaintDepartment;
  created_at: string;
  user?: User;
  ward?: Ward;
}

export interface Officer {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  role: OfficerRole;
  department_id: number;
  password?: string;
  department_name?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  ward_id?: number | null;
  ward_name?: string | null;
  designation?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OfficerMapping {
  id: number;
  zone_id: number;
  ward_id: number;
  department_id: number;
  category_id: number;
  l1_officer_id: string;
  l2_officer_id: string;
  l3_officer_id: string;
  sla_l1: number;
  sla_l2: number;
  sla_l3: number;
}

export interface ComplaintHistoryEntry {
  id: string;
  complaint_id: string;
  action: ComplaintHistoryAction;
  from_officer?: string | null;
  to_officer?: string | null;
  level: OfficerLevel;
  timestamp: string;
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

export interface ComplaintTimelineData {
  complaint_id: string;
  updates: ComplaintUpdate[];
}

export interface ComplaintProofData {
  complaint_id: string;
  proof_image?: ComplaintAttachment | null;
  proof_images?: ComplaintAttachment[];
  proof_text?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  rating?: Rating | null;
  proofs?: ComplaintProofRecord[];
}

export interface ComplaintProofRecord {
  id: string;
  complaint_id: string;
  image_url: string;
  description?: string | null;
  created_at?: string;
}

export interface PublicComplaintSummary {
  complaint_id: string;
  status: string;
  current_stage: string;
  department: string;
  last_updated: string;
}

export interface PublicComplaintLookupResult {
  access: 'public' | 'owner';
  complaint: PublicComplaintSummary;
  redirect_to?: string;
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
  complaint_id: string;
  tracking_code: string;
  user_id: string;
  citizen_id?: string;
  applicant_name?: string | null;
  applicant_mobile?: string | null;
  applicant_email?: string | null;
  applicant_address?: string | null;
  applicant_gender?: string | null;
  previous_complaint_id?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  ward_id: number;
  department_id?: number | null;
  department_name?: string | null;
  department: ComplaintDepartment;
  title: string;
  text: string;
  description?: string;
  category_id?: number | null;
  category_name?: string | null;
  category: ComplaintCategory;
  status: ComplaintStatus;
  progress: ComplaintProgress;
  dept_head_viewed: boolean;
  worker_assigned: boolean;
  priority: ComplaintPriority;
  risk_score: number;
  sentiment_score?: number;
  frequency_score?: number;
  hotspot_count?: number;
  is_hotspot?: boolean;
  is_spam?: boolean;
  spam_reasons?: string[];
  department_message?: string;
  street_address?: string | null;
  location_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  attachments?: ComplaintAttachment[];
  proof_image?: ComplaintAttachment | null;
  proof_images?: ComplaintAttachment[];
  proof_text?: string | null;
  assigned_worker_id?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  assigned_to?: string | null;
  ward_name?: string;
  citizen_name?: string;
  created_at: string;
  updated_at: string;
  current_level?: OfficerLevel | null;
  deadline?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  updates?: ComplaintUpdate[];
  history?: ComplaintHistoryEntry[];
  rating?: Rating | null;
  proof_count?: number;
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
  department?: ComplaintDepartment | 'all';
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

export interface OfficerDashboardSummary {
  assigned_total: number;
  assigned_open: number;
  pending_level: number;
  resolved: number;
  overdue: number;
  items: Complaint[];
}

export interface ComplaintTrendSummary {
  total_complaints: number;
  complaints_last_7_days: number;
  resolved_last_7_days: number;
  high_priority_open: number;
  category_breakdown: Array<{ category: ComplaintCategory; count: number }>;
  status_breakdown: Array<{ status: ComplaintStatus; count: number }>;
  priority_breakdown: Array<{ priority: 'critical' | 'high' | 'medium' | 'low'; count: number }>;
  daily_intake: Array<{ date: string; label: string; count: number }>;
  ward_velocity: Array<{ ward_id: number; ward_name: string; count: number }>;
  generated_at: string;
}

export interface ComplaintWardComparisonSummary {
  total_wards: number;
  wards_with_recent_activity: number;
  hotspot_wards: number;
  ward_rows: Array<{
    ward_id: number;
    ward_name: string;
    total_complaints: number;
    open_complaints: number;
    resolved_complaints: number;
    high_priority_open: number;
    complaints_last_7_days: number;
    complaints_last_24_hours: number;
    hotspot_watch: boolean;
  }>;
  generated_at: string;
}
