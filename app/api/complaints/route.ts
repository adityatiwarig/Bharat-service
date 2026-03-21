import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { createComplaintForUser, listComplaintsForUser } from '@/lib/server/complaints';
import { listWards } from '@/lib/server/wards';

export const runtime = 'nodejs';

function parseBoolean(value: string | null) {
  return value === 'true' || value === '1';
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);

    const complaints = await listComplaintsForUser(user, {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      page_size: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 10,
      q: searchParams.get('q') || undefined,
      status: (searchParams.get('status') as never) || undefined,
      priority: (searchParams.get('priority') as never) || undefined,
      category: (searchParams.get('category') as never) || undefined,
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
    const ward_id = Number(formData.get('ward_id') || 0);
    const location_address = String(formData.get('location_address') || '').trim();
    const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : undefined;
    const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : undefined;
    const attachments = formData
      .getAll('attachments')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!title || !text || !Number.isFinite(ward_id) || ward_id <= 0) {
      return NextResponse.json(
        { error: 'Title, complaint text, and ward are required.' },
        { status: 400 },
      );
    }

    const wards = await listWards();
    const wardExists = wards.some((ward) => ward.id === ward_id);

    if (!wardExists) {
      return NextResponse.json({ error: 'Please choose a valid ward before submitting.' }, { status: 400 });
    }

    const complaint = await createComplaintForUser(
      user,
      {
        title,
        text,
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
