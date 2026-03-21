import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getComplaintByIdForUser, updateComplaintStatusForUser } from '@/lib/server/complaints';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const complaint = await getComplaintByIdForUser(user, id);

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    return NextResponse.json({ complaint });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load complaint', error);
    return NextResponse.json({ error: 'Unable to load complaint right now.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(['worker', 'admin']);
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string; note?: string };

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
    }

    const complaint = await updateComplaintStatusForUser(user, id, {
      status: body.status as never,
      note: body.note,
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to update complaint', error);
    return NextResponse.json({ error: 'Unable to update complaint right now.' }, { status: 500 });
  }
}
