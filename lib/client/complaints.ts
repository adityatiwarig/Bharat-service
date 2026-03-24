import { fetchJson } from '@/lib/client/api';
import type {
  Complaint,
  ComplaintCategory,
  ComplaintDepartment,
  ComplaintListFilters,
  ComplaintProofData,
  ComplaintPriority,
  ComplaintSatisfaction,
  ComplaintStatus,
  OfficerDashboardSummary,
  ComplaintTimelineData,
  ComplaintTrendSummary,
  ComplaintWardComparisonSummary,
  GrievanceMappingResponse,
  PaginatedResult,
  PublicComplaintLookupResult,
  Rating,
  Ward,
} from '@/lib/types';

type ComplaintFetchView = 'summary' | 'full';
type ComplaintFetchOptions = {
  view?: ComplaintFetchView;
  force?: boolean;
};

const complaintCache = new Map<string, Complaint>();
const complaintTimelineCache = new Map<string, ComplaintTimelineData>();
const complaintProofCache = new Map<string, ComplaintProofData>();

function withSearchParams(baseUrl: string, options: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === '' || value === false) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export async function fetchComplaints(options: ComplaintListFilters = {}) {
  return fetchJson<PaginatedResult<Complaint>>(withSearchParams('/api/complaints', {
    page: options.page,
    pageSize: options.page_size,
    q: options.q,
    status: options.status,
    priority: options.priority,
    zoneId: options.zone_id,
    departmentId: options.department_id,
    category: options.category,
    department: options.department,
    wardId: options.ward_id,
    mine: options.mine,
    myAssigned: options.my_assigned,
  }));
}

function getComplaintCacheKey(id: string, view: ComplaintFetchView) {
  return `${id}:${view}`;
}

function invalidateComplaintCache(id: string) {
  void id;
  complaintCache.clear();
  complaintTimelineCache.clear();
  complaintProofCache.clear();
}

export async function fetchComplaintById(id: string, options: ComplaintFetchOptions = {}) {
  const view = options.view || 'full';
  const cacheKey = getComplaintCacheKey(id, view);

  if (!options.force && complaintCache.has(cacheKey)) {
    return complaintCache.get(cacheKey)!;
  }

  const data = await fetchJson<{ complaint: Complaint }>(withSearchParams(`/api/complaints/${id}`, { view }));
  complaintCache.set(cacheKey, data.complaint);
  return data.complaint;
}

export async function fetchComplaintTimeline(id: string, options: Pick<ComplaintFetchOptions, 'force'> = {}) {
  if (!options.force && complaintTimelineCache.has(id)) {
    return complaintTimelineCache.get(id)!;
  }

  const data = await fetchJson<{ timeline: ComplaintTimelineData }>(`/api/complaints/${id}/timeline`);
  complaintTimelineCache.set(id, data.timeline);
  return data.timeline;
}

export async function fetchComplaintProof(id: string, options: Pick<ComplaintFetchOptions, 'force'> = {}) {
  if (!options.force && complaintProofCache.has(id)) {
    return complaintProofCache.get(id)!;
  }

  const data = await fetchJson<{ proof: ComplaintProofData }>(`/api/complaints/${id}/proof`);
  complaintProofCache.set(id, data.proof);
  return data.proof;
}

export async function fetchPublicComplaintByTrackingCode(trackingCode: string) {
  const code = trackingCode.trim();

  return fetchJson<PublicComplaintLookupResult>(`/api/public/complaints/${encodeURIComponent(code)}`);
}

export async function updateComplaintStatus(id: string, input: { status: ComplaintStatus; note?: string }) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  invalidateComplaintCache(id);
  return data.complaint;
}

export async function submitComplaintResolutionProof(
  id: string,
  input: { proof_text: string; note?: string; proof_images: File[] },
) {
  const body = new FormData();
  body.set('status', 'resolved');
  body.set('proof_text', input.proof_text);
  input.proof_images.forEach((file) => {
    body.append('proof_images', file);
  });

  if (input.proof_images[0]) {
    body.set('proof_image', input.proof_images[0]);
  }

  if (input.note?.trim()) {
    body.set('note', input.note.trim());
  }

  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    body,
  });

  invalidateComplaintCache(id);
  return data.complaint;
}

export async function rateComplaint(id: string, input: { rating?: number; satisfaction?: ComplaintSatisfaction; feedback?: string }) {
  const data = await fetchJson<{ rating: Rating }>(`/api/complaints/${id}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  invalidateComplaintCache(id);
  return data.rating;
}

export async function closeComplaintLifecycle(id: string, note?: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'close', note }),
  });

  invalidateComplaintCache(id);
  return data.complaint;
}

export async function reopenComplaintLifecycle(id: string, note?: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reopen', note }),
  });

  invalidateComplaintCache(id);
  return data.complaint;
}

export async function fetchWards() {
  const data = await fetchJson<{ wards: Ward[] }>('/api/wards');
  return data.wards;
}

export async function fetchGrievanceMapping(options: { zoneId?: number; departmentId?: number } = {}) {
  return fetchJson<GrievanceMappingResponse>(withSearchParams('/api/grievance-mapping', {
    zoneId: options.zoneId,
    departmentId: options.departmentId,
  }));
}

export async function fetchAdminDashboard(options: { zoneId?: number } = {}) {
  return fetchJson<{
    summary: {
      total_complaints: number;
      open_count: number;
      high_priority_count: number;
      overdue_count: number;
      awaiting_feedback_count: number;
      resolution_rate: number;
      category_breakdown: Array<{ category: ComplaintCategory; count: number }>;
      level_breakdown: Array<{ level: 'L1' | 'L2' | 'L3' | 'L2_ESCALATED' | 'unassigned'; count: number }>;
      zone_breakdown: Array<{ zone_id: number | null; zone_name: string; count: number; open_count: number }>;
      department_breakdown: Array<{ department_id: number | null; department_name: string; count: number; open_count: number }>;
      top_urgent_issues: Complaint[];
      most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
      hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
    };
  }>(withSearchParams('/api/dashboard/admin', {
    zoneId: options.zoneId,
  }));
}

export async function fetchWorkerDashboard() {
  return fetchJson<{
    summary: {
      assigned_total: number;
      assigned_open: number;
      in_progress: number;
      resolved: number;
      urgent_queue: number;
      items: Complaint[];
    };
  }>('/api/dashboard/worker');
}

export async function fetchOfficerDashboard() {
  return fetchJson<{ summary: OfficerDashboardSummary }>('/api/dashboard/officer');
}

export async function fetchLeaderTrendSummary() {
  return fetchJson<{ summary: ComplaintTrendSummary }>('/api/dashboard/leader-trends');
}

export async function fetchLeaderWardComparisonSummary() {
  return fetchJson<{ summary: ComplaintWardComparisonSummary }>('/api/dashboard/leader-ward-comparison');
}

export async function fetchUsers() {
  const data = await fetchJson<{ users: Array<{ id: string; name: string; email: string; role: string; officer_id?: string | null; officer_role?: 'L1' | 'L2' | 'L3' | 'ADMIN' | null; officer_department_name?: string | null; officer_department_names?: string[]; source_row_count?: number; officer_zone_id?: number | null; officer_zone_name?: string | null; officer_ward_id?: number | null; officer_ward_name?: string | null; officer_ward_names?: string[]; ward_id?: number | null; ward_name?: string | null; department?: ComplaintDepartment | null; created_at: string }> }>('/api/users');
  return data.users;
}

export async function fetchAssignableWorkers(complaintId: string) {
  const data = await fetchJson<{ workers: Array<{ id: string; ward_id: number; department: ComplaintDepartment; user_id?: string; user_name?: string; user_email?: string }> }>(
    `/api/complaints/${complaintId}/assignment`,
  );

  return data.workers;
}

export async function markComplaintViewed(complaintId: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${complaintId}/assignment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_viewed' }),
  });

  invalidateComplaintCache(complaintId);
  return data.complaint;
}

export async function assignComplaintWorker(complaintId: string, worker_id: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${complaintId}/assignment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'assign_worker', worker_id }),
  });

  invalidateComplaintCache(complaintId);
  return data.complaint;
}

export async function forwardComplaintToNextLevel(complaintId: string) {
  const data = await fetchJson<{
    success: boolean;
    escalation: {
      complaint_id: string;
      next_level: 'L2' | 'L3';
      assigned_officer_id: string;
      deadline: string;
    };
  }>(`/api/complaints/${complaintId}/escalate`, {
    method: 'PATCH',
  });

  invalidateComplaintCache(complaintId);
  return data.escalation;
}

export async function markComplaintViewedByL1(complaintId: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      work_status: 'Viewed by L1';
    };
  }>(`/api/complaints/${complaintId}/l1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'viewed' }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function markComplaintOnSiteByL1(complaintId: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'in_progress';
      work_status: 'On Site';
    };
  }>(`/api/complaints/${complaintId}/l1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'on_site' }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function markComplaintWorkStartedByL1(complaintId: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'in_progress';
      work_status: 'Work Started';
    };
  }>(`/api/complaints/${complaintId}/l1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'work_started' }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function completeComplaintByL1(complaintId: string, note?: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'resolved';
      work_status: 'Awaiting Citizen Feedback';
    };
  }>(`/api/complaints/${complaintId}/l1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'completed', note }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function markComplaintReachedByL3(complaintId: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'in_progress';
    };
  }>(`/api/complaints/${complaintId}/l3`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reached' }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function uploadComplaintProofByL3(
  complaintId: string,
  input: { image: File; description?: string },
) {
  const body = new FormData();
  body.set('image', input.image);

  if (input.description?.trim()) {
    body.set('description', input.description.trim());
  }

  const data = await fetchJson<{
    success: boolean;
    proof: {
      id: string;
      complaint_id: string;
      image_url: string;
      description?: string | null;
      created_at: string;
    };
  }>(`/api/complaints/${complaintId}/proofs`, {
    method: 'POST',
    body,
  });

  invalidateComplaintCache(complaintId);
  return data.proof;
}

export async function uploadComplaintProofByExecutionOfficer(
  complaintId: string,
  input: { image: File; description?: string },
) {
  return uploadComplaintProofByL3(complaintId, input);
}

export async function markComplaintResolvedByL3(complaintId: string, note?: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'resolved';
    };
  }>(`/api/complaints/${complaintId}/l3`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resolved', note }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function closeComplaintByL2Review(complaintId: string, note?: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'closed';
    };
  }>(`/api/complaints/${complaintId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'close', note }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function reopenComplaintByL2Review(complaintId: string, note?: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      status: 'reopened';
      current_level: 'L1' | 'L3';
    };
  }>(`/api/complaints/${complaintId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reopen', note }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function sendReminderToL1FromL2(complaintId: string, note?: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      reminded_officer_name?: string | null;
    };
  }>(`/api/complaints/${complaintId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'remind_l1', note }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

export async function sendReminderToL2FromL3(complaintId: string, note?: string) {
  const data = await fetchJson<{
    success: boolean;
    result: {
      complaint_id: string;
      reminded_officer_name?: string | null;
    };
  }>(`/api/complaints/${complaintId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'remind_l2', note }),
  });

  invalidateComplaintCache(complaintId);
  return data.result;
}

