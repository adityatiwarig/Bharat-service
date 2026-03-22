import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getComplaintProofForUser } from '@/lib/server/complaints';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const proof = await getComplaintProofForUser(user, id);

    if (!proof) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { proof },
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

    console.error('Failed to load complaint proof', error);
    return NextResponse.json({ error: 'Unable to load complaint proof right now.' }, { status: 500 });
  }
}
