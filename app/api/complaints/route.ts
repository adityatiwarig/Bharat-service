import { NextResponse } from 'next/server';

import { buildComplaintSiteAddress, resolveGrievanceSelection } from '@/lib/grievance-mapping';
import { AuthError, requireApiUser } from '@/lib/server/auth';
import { createComplaintForUser, listComplaintsForUser } from '@/lib/server/complaints';

export const runtime = 'nodejs';

const MAX_COMPLAINT_ATTACHMENTS = 6;
const MAX_COMPLAINT_ATTACHMENT_SIZE = 8 * 1024 * 1024;

function parseBoolean(value: string | null) {
  return value === 'true' || value === '1';
}

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

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);

    const complaints = await listComplaintsForUser(user, {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      page_size: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 10,
      q: searchParams.get('complaintId') || searchParams.get('q') || undefined,
      status: (searchParams.get('status') as never) || undefined,
      priority: (searchParams.get('priority') as never) || undefined,
      zone_id: searchParams.get('zoneId') ? Number(searchParams.get('zoneId')) : undefined,
      department_id: searchParams.get('departmentId') ? Number(searchParams.get('departmentId')) : undefined,
      category: (searchParams.get('category') as never) || undefined,
      department: (searchParams.get('department') as never) || undefined,
      ward_id: searchParams.get('wardId') ? Number(searchParams.get('wardId')) : undefined,
      mine: parseBoolean(searchParams.get('mine')),
      my_assigned: parseBoolean(searchParams.get('myAssigned')),
    });

    return NextResponse.json(complaints);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to list complaints', error);
    return NextResponse.json({ error: 'Unable to load complaints right now.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(['citizen']);
    const formData = await request.formData();

    const title = String(formData.get('title') || '').trim();
    const text = String(formData.get('text') || formData.get('description') || '').trim();
    const applicant_name = String(formData.get('applicant_name') || '').trim();
    const applicant_mobile = normalizeCitizenPhone(String(formData.get('applicant_mobile') || '').trim());
    const applicant_email = String(formData.get('applicant_email') || '').trim().toLowerCase();
    const applicant_address = String(formData.get('applicant_address') || '').trim();
    const applicant_gender = String(formData.get('applicant_gender') || '').trim();
    const previous_complaint_id = String(formData.get('previous_complaint_id') || '').trim();
    const zone_id = Number(formData.get('zone_id') || 0);
    const ward_id = Number(formData.get('ward_id') || 0);
    const department_id = Number(formData.get('department_id') || 0);
    const category_id = Number(formData.get('category_id') || 0);
    const street_address = String(formData.get('street_address') || '').trim();
    const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : undefined;
    const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : undefined;
    const attachments = formData
      .getAll('attachments')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!attachments.length) {
      return NextResponse.json(
        { error: 'Upload at least one complaint photo before submitting the complaint.' },
        { status: 400 },
      );
    }

    if (attachments.length > MAX_COMPLAINT_ATTACHMENTS) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_COMPLAINT_ATTACHMENTS} complaint photos only.` },
        { status: 400 },
      );
    }

    const invalidAttachment = attachments.find((file) => !file.type.startsWith('image/'));

    if (invalidAttachment) {
      return NextResponse.json(
        { error: 'Only image files are allowed for citizen complaint photos.' },
        { status: 400 },
      );
    }

    const oversizedAttachment = attachments.find((file) => file.size > MAX_COMPLAINT_ATTACHMENT_SIZE);

    if (oversizedAttachment) {
      return NextResponse.json(
        { error: 'Each complaint photo must be 8 MB or smaller.' },
        { status: 400 },
      );
    }

    if (
      !applicant_name ||
      !applicant_mobile ||
      !applicant_address ||
      !title ||
      !text ||
      !Number.isFinite(zone_id) ||
      zone_id <= 0 ||
      !Number.isFinite(ward_id) ||
      ward_id <= 0 ||
      !Number.isFinite(department_id) ||
      department_id <= 0 ||
      !Number.isFinite(category_id) ||
      category_id <= 0
    ) {
      return NextResponse.json(
        { error: 'Zone, ward, department, category, applicant details, complaint details, and at least one photo are required.' },
        { status: 400 },
      );
    }

    const selection = resolveGrievanceSelection({
      zone_id,
      ward_id,
      department_id,
      category_id,
    });

    if (!selection) {
      return NextResponse.json(
        { error: 'The selected zone, ward, department, and category combination is invalid.' },
        { status: 400 },
      );
    }

    const location_address = buildComplaintSiteAddress({
      zoneName: selection.zone.name,
      wardName: selection.ward.name,
      streetAddress: street_address,
    });

    const complaint = await createComplaintForUser(
      user,
      {
        applicant_name,
        applicant_mobile,
        applicant_email: applicant_email || user.email || '',
        applicant_address,
        applicant_gender: applicant_gender || undefined,
        previous_complaint_id: previous_complaint_id || undefined,
        zone_id,
        title,
        text,
        category: selection.legacy_category,
        category_id,
        department: selection.legacy_department,
        department_id,
        ward_id,
        street_address,
        location_address,
        latitude,
        longitude,
      },
      attachments,
    );

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to create complaint', error);
    return NextResponse.json({ error: 'Unable to submit complaint right now.' }, { status: 500 });
  }
}
