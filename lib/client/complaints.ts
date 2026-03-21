import { fetchJson } from '@/lib/client/api';
import type {
  Complaint,
  ComplaintCategory,
  ComplaintDepartment,
  ComplaintListFilters,
  ComplaintPriority,
  ComplaintStatus,
  PaginatedResult,
  Rating,
  Ward,
} from '@/lib/types';

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
    category: options.category,
    department: options.department,
    wardId: options.ward_id,
    mine: options.mine,
    myAssigned: options.my_assigned,
  }));
}

export async function fetchComplaintById(id: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`);
  return data.complaint;
}

export async function updateComplaintStatus(id: string, input: { status: ComplaintStatus; note?: string }) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return data.complaint;
}

export async function submitComplaintResolutionProof(
  id: string,
  input: { proof_text: string; note?: string; proof_image: File },
) {
  const body = new FormData();
  body.set('status', 'resolved');
  body.set('proof_text', input.proof_text);
  body.set('proof_image', input.proof_image);

  if (input.note?.trim()) {
    body.set('note', input.note.trim());
  }

  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    body,
  });

  return data.complaint;
}

export async function rateComplaint(id: string, input: { rating: number; feedback?: string }) {
  const data = await fetchJson<{ rating: Rating }>(`/api/complaints/${id}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return data.rating;
}

export async function closeComplaintLifecycle(id: string, note?: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'close', note }),
  });

  return data.complaint;
}

export async function reopenComplaintLifecycle(id: string, note?: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reopen', note }),
  });

  return data.complaint;
}

export async function fetchWards() {
  const data = await fetchJson<{ wards: Ward[] }>('/api/wards');
  return data.wards;
}

export async function fetchAdminDashboard() {
  return fetchJson<{
    summary: {
      total_complaints: number;
      high_priority_count: number;
      resolution_rate: number;
      category_breakdown: Array<{ category: ComplaintCategory; count: number }>;
      top_urgent_issues: Complaint[];
      most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
      hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
    };
  }>('/api/dashboard/admin');
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

export async function fetchUsers() {
  const data = await fetchJson<{ users: Array<{ id: string; name: string; email: string; role: string; ward_id?: number | null; ward_name?: string | null; department?: ComplaintDepartment | null; created_at: string }> }>('/api/users');
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

  return data.complaint;
}

export async function assignComplaintWorker(complaintId: string, worker_id: string) {
  const data = await fetchJson<{ complaint: Complaint }>(`/api/complaints/${complaintId}/assignment`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'assign_worker', worker_id }),
  });

  return data.complaint;
}

