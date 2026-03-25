import { NextResponse } from 'next/server';

import { buildComplaintSiteAddress, resolveGrievanceSelection } from '@/lib/grievance-mapping';
import { AuthError, requireApiUser } from '@/lib/server/auth';
import { joinIssueGroupForUser } from '@/lib/server/complaints';

export const runtime = 'nodejs';

function normalizeCitizenPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  let normalized = digits;

  if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = normalized.slice(1);
  }

  if (normalized.length !== 10) {
    throw new AuthError('Enter a valid 10-digit mobile number.', 400);
  }

  return `+91${normalized}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(['citizen']);
    const body = (await request.json()) as {
      issue_group_id?: string;
      primary_complaint_id?: string;
      applicant_name?: string;
      applicant_mobile?: string;
      applicant_email?: string;
      applicant_address?: string;
      applicant_gender?: string;
      zone_id?: number;
      ward_id?: number;
      department_id?: number;
      category_id?: number;
      title?: string;
      text?: string;
      street_address?: string;
      latitude?: number;
      longitude?: number;
    };

    const issueGroupId = String(body.issue_group_id || '').trim();
    const primaryComplaintId = String(body.primary_complaint_id || '').trim();
    const applicantName = String(body.applicant_name || '').trim();
    const applicantMobile = normalizeCitizenPhone(String(body.applicant_mobile || '').trim());
    const applicantEmail = String(body.applicant_email || '').trim().toLowerCase();
    const applicantAddress = String(body.applicant_address || '').trim();
    const applicantGender = String(body.applicant_gender || '').trim();
    const zoneId = Number(body.zone_id || 0);
    const wardId = Number(body.ward_id || 0);
    const departmentId = Number(body.department_id || 0);
    const categoryId = Number(body.category_id || 0);
    const streetAddress = String(body.street_address || '').trim();
    const title = String(body.title || '').trim();
    const text = String(body.text || '').trim();
    const latitude = body.latitude === undefined || body.latitude === null ? undefined : Number(body.latitude);
    const longitude = body.longitude === undefined || body.longitude === null ? undefined : Number(body.longitude);

    if ((!issueGroupId && !primaryComplaintId) || !applicantName || !applicantMobile || !applicantAddress || zoneId <= 0 || wardId <= 0 || departmentId <= 0 || categoryId <= 0) {
      return NextResponse.json(
        { error: 'Applicant details, issue selection, zone, ward, department, and category are required to join an issue.' },
        { status: 400 },
      );
    }

    const selection = resolveGrievanceSelection({
      zone_id: zoneId,
      ward_id: wardId,
      department_id: departmentId,
      category_id: categoryId,
    });

    if (!selection) {
      return NextResponse.json(
        { error: 'The selected zone, ward, department, and category combination is invalid.' },
        { status: 400 },
      );
    }

    const complaint = await joinIssueGroupForUser(user, {
      issue_group_id: issueGroupId,
      primary_complaint_id: primaryComplaintId || undefined,
      applicant_name: applicantName,
      applicant_mobile: applicantMobile,
      applicant_email: applicantEmail || user.email || '',
      applicant_address: applicantAddress,
      applicant_gender: applicantGender || undefined,
      zone_id: zoneId,
      ward_id: wardId,
      department_id: departmentId,
      category_id: categoryId,
      title: title || undefined,
      text: text || undefined,
      street_address: streetAddress || undefined,
      location_address: buildComplaintSiteAddress({
        zoneName: selection.zone.name,
        wardName: selection.ward.name,
        streetAddress,
      }),
      latitude,
      longitude,
    });

    return NextResponse.json({
      complaintId: complaint.id,
      trackingCode: complaint.complaint_id || complaint.tracking_code,
      complaint,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to join issue group', error);
    return NextResponse.json({ error: 'Unable to join this community issue right now.' }, { status: 500 });
  }
}
