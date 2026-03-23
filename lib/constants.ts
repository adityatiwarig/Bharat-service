import type { ComplaintCategory, ComplaintDepartment, ComplaintPriority, ComplaintStatus, Ward } from '@/lib/types';

export const DELHI_WARDS: Ward[] = [
  { id: 1, name: 'Rohini', city: 'Delhi' },
  { id: 2, name: 'Dwarka', city: 'Delhi' },
  { id: 3, name: 'Saket', city: 'Delhi' },
  { id: 4, name: 'Laxmi Nagar', city: 'Delhi' },
  { id: 5, name: 'Karol Bagh', city: 'Delhi' },
];

export function getWardLoginSlug(wardName: string) {
  const normalized = wardName.trim().toLowerCase();

  if (normalized === 'laxmi nagar') {
    return 'laxmi';
  }

  if (normalized === 'karol bagh') {
    return 'karol';
  }

  return normalized.split(/\s+/)[0] || normalized;
}

export const DELHI_WARD_LOGIN_OPTIONS = DELHI_WARDS.map((ward) => ({
  ...ward,
  slug: getWardLoginSlug(ward.name),
}));

export const COMPLAINT_CATEGORIES: Array<{ value: ComplaintCategory; label: string }> = [
  { value: 'pothole', label: 'Road Damage / Pothole' },
  { value: 'streetlight', label: 'Streetlight Issue' },
  { value: 'water', label: 'Water Supply / Leakage' },
  { value: 'waste', label: 'Waste Collection / Garbage' },
  { value: 'sanitation', label: 'Sanitation / Cleanliness' },
  { value: 'drainage', label: 'Drainage Blockage' },
  { value: 'sewer', label: 'Sewer Overflow' },
  { value: 'encroachment', label: 'Illegal Encroachment' },
  { value: 'other', label: 'Other Civic Issue' },
];

export const COMPLAINT_DEPARTMENTS: Array<{ value: ComplaintDepartment; label: string }> = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'sanitation', label: 'Sanitation' },
  { value: 'roads', label: 'Roads' },
  { value: 'fire', label: 'Fire' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'streetlight', label: 'Streetlight' },
];

export const COMPLAINT_PRIORITIES: Array<{ value: ComplaintPriority; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const COMPLAINT_STATUSES: Array<{ value: ComplaintStatus; label: string }> = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];
