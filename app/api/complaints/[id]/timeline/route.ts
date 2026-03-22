import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getComplaintTimelineForUser } from '@/lib/server/complaints';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const timeline = await getComplaintTimelineForUser(user, id);

    if (!timeline) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { timeline },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load complaint timeline', error);
    return NextResponse.json({ error: 'Unable to load complaint timeline right now.' }, { status: 500 });
  }
}
