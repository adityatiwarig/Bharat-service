import { NextResponse } from 'next/server';

import { AuthError, requireApiOfficerUser } from '@/lib/server/auth';
import { closeComplaintByL2Review, reopenComplaintFromL2Review } from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiOfficerUser(['L2'], request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'close' | 'reopen';
      note?: string;
    };

    if (body.action === 'close') {
      const result = await closeComplaintByL2Review(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'reopen') {
      const result = await reopenComplaintFromL2Review(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Unsupported L2 review action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process L2 review action', error);
    return NextResponse.json({ error: 'Unable to process the L2 review action right now.' }, { status: 500 });
  }
}
