import { NextResponse } from 'next/server';

import { COMPLAINT_CATEGORIES, COMPLAINT_DEPARTMENTS } from '@/lib/constants';
import { AuthError, requireApiUser } from '@/lib/server/auth';
import { createComplaintForUser, listComplaintsForUser, resolveComplaintDepartment } from '@/lib/server/complaints';
import { listWards } from '@/lib/server/wards';

export const runtime = 'nodejs';

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
    const category = String(formData.get('category') || 'other').trim().toLowerCase();
    const previous_complaint_id = String(formData.get('previous_complaint_id') || '').trim();
    const ward_id = Number(formData.get('ward_id') || 0);
    const submittedDepartment = String(formData.get('department') || '').trim().toLowerCase();
    const location_address = String(formData.get('location_address') || '').trim();
    const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : undefined;
    const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : undefined;
    const attachments = formData
      .getAll('attachments')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!applicant_name || !applicant_mobile || !applicant_address || !title || !text || !Number.isFinite(ward_id) || ward_id <= 0) {
      return NextResponse.json(
        { error: 'Applicant details, complaint details, and ward are required.' },
        { status: 400 },
      );
    }

    const wards = await listWards();
    const wardExists = wards.some((ward) => ward.id === ward_id);
    const resolvedDepartment = resolveComplaintDepartment({
      department: submittedDepartment,
      category,
      title,
      text,
    });
    const departmentExists = COMPLAINT_DEPARTMENTS.some((item) => item.value === resolvedDepartment);
    const categoryExists = COMPLAINT_CATEGORIES.some((item) => item.value === category);

    if (!wardExists) {
      return NextResponse.json({ error: 'Please choose a valid ward before submitting.' }, { status: 400 });
    }

    if (!departmentExists) {
      return NextResponse.json({ error: 'Unable to detect a valid department for this complaint.' }, { status: 400 });
    }

    if (!categoryExists) {
      return NextResponse.json({ error: 'Please choose a valid grievance category.' }, { status: 400 });
    }

    const complaint = await createComplaintForUser(
      user,
      {
        applicant_name,
        applicant_mobile,
        applicant_email: applicant_email || user.email || '',
        applicant_address,
        applicant_gender: applicant_gender || undefined,
        previous_complaint_id: previous_complaint_id || undefined,
        title,
        text,
        category: category as never,
        department: resolvedDepartment as never,
        ward_id,
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
