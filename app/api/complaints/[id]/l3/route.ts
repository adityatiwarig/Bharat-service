import { NextResponse } from 'next/server';

import { AuthError, requireApiL3Officer } from '@/lib/server/auth';
import { markComplaintReachedByL3, markComplaintResolvedByL3 } from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiL3Officer(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'reached' | 'resolved';
      note?: string;
    };

    if (body.action === 'reached') {
      const result = await markComplaintReachedByL3(user, id);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'resolved') {
      const result = await markComplaintResolvedByL3(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Unsupported L3 action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process L3 complaint action', error);
    return NextResponse.json({ error: 'Unable to process the L3 action right now.' }, { status: 500 });
  }
}
