import { NextRequest, NextResponse } from 'next/server';

import { createComplaint, listComplaints } from '@/lib/server/complaints-store';
import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@/lib/types';

export const runtime = 'nodejs';

const validCategories: ComplaintCategory[] = [
  'pothole',
  'streetlight',
  'water',
  'waste',
  'sanitation',
  'other',
];

const validPriorities: ComplaintPriority[] = ['low', 'medium', 'high', 'urgent'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const complaints = await listComplaints({
    citizenId: searchParams.get('citizenId') || undefined,
    status: (searchParams.get('status') as ComplaintStatus | 'all' | null) || undefined,
    query: searchParams.get('q') || undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  });

  return NextResponse.json({ complaints });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const category = String(formData.get('category') || '').trim() as ComplaintCategory;
    const priority = String(formData.get('priority') || 'medium').trim() as ComplaintPriority;
    const citizen_id = String(formData.get('citizen_id') || '').trim();
    const citizen_name = String(formData.get('citizen_name') || '').trim();
    const contact_phone = String(formData.get('contact_phone') || '').trim();
    const ward_id = Number(formData.get('ward_id') || 0);
    const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : undefined;
    const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : undefined;
    const location_address = String(formData.get('location_address') || '').trim();
    const location_accuracy_meters = formData.get('location_accuracy_meters')
      ? Number(formData.get('location_accuracy_meters'))
      : undefined;

    const files = formData
      .getAll('attachments')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!title || !description || !citizen_id || !ward_id) {
      return NextResponse.json(
        { error: 'Title, description, ward, and citizen information are required.' },
        { status: 400 },
      );
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid complaint category.' }, { status: 400 });
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid complaint priority.' }, { status: 400 });
    }

    const complaint = await createComplaint(
      {
        citizen_id,
        citizen_name,
        contact_phone,
        title,
        description,
        category,
        priority,
        ward_id,
        latitude,
        longitude,
        location_address,
        location_accuracy_meters,
      },
      files,
    );

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    console.error('Failed to create complaint', error);
    return NextResponse.json(
      { error: 'Unable to submit complaint at the moment.' },
      { status: 500 },
    );
  }
}
