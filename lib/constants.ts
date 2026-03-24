import type { ComplaintCategory, ComplaintDepartment, ComplaintPriority, ComplaintStatus, Ward } from '@/lib/types';

export const DELHI_WARDS: Ward[] = [
  { id: 1, name: 'Rohini Sector 1', city: 'Delhi', zone_id: 1, zone_name: 'Rohini' },
  { id: 2, name: 'Rohini Sector 7', city: 'Delhi', zone_id: 1, zone_name: 'Rohini' },
  { id: 3, name: 'Rohini Sector 16', city: 'Delhi', zone_id: 1, zone_name: 'Rohini' },
  { id: 4, name: 'Dev Nagar', city: 'Delhi', zone_id: 2, zone_name: 'Karol Bagh' },
  { id: 5, name: 'Karol Bagh Ward', city: 'Delhi', zone_id: 2, zone_name: 'Karol Bagh' },
  { id: 6, name: 'Paharganj', city: 'Delhi', zone_id: 2, zone_name: 'Karol Bagh' },
];

export function getWardLoginSlug(wardName: string) {
  const normalized = wardName.trim().toLowerCase();
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
  { value: 'reopened', label: 'Reopened' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'l1_deadline_missed', label: 'L1 Deadline Missed' },
  { value: 'l2_deadline_missed', label: 'L2 Deadline Missed' },
  { value: 'l3_failed_back_to_l2', label: 'L3 Failed Back To L2' },
  { value: 'expired', label: 'Expired' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];
