import type { Complaint, ComplaintStatus } from '@/lib/types';

export interface ComplaintQueryOptions {
  citizenId?: string;
  status?: ComplaintStatus | 'all';
  q?: string;
  limit?: number;
}

function withSearchParams(baseUrl: string, options: ComplaintQueryOptions) {
  const searchParams = new URLSearchParams();

  if (options.citizenId) {
    searchParams.set('citizenId', options.citizenId);
  }

  if (options.status && options.status !== 'all') {
    searchParams.set('status', options.status);
  }

  if (options.q?.trim()) {
    searchParams.set('q', options.q.trim());
  }

  if (options.limit) {
    searchParams.set('limit', String(options.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export async function fetchComplaints(options: ComplaintQueryOptions) {
  const response = await fetch(withSearchParams('/api/complaints', options), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load complaints.');
  }

  const data = (await response.json()) as { complaints: Complaint[] };
  return data.complaints;
}

export async function fetchComplaintById(id: string) {
  const response = await fetch(`/api/complaints/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load complaint details.');
  }

  const data = (await response.json()) as { complaint: Complaint };
  return data.complaint;
}
