import { fetchJson } from '@/lib/client/api';
import type {
  Complaint,
  ComplaintCategory,
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

export async function rateComplaint(id: string, input: { rating: number; feedback?: string }) {
  const data = await fetchJson<{ rating: Rating }>(`/api/complaints/${id}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return data.rating;
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
  const data = await fetchJson<{ users: Array<{ id: string; name: string; email: string; role: string; ward_id?: number | null; created_at: string }> }>('/api/users');
  return data.users;
}
