import { NextResponse } from 'next/server';

import { AuthError, requireApiL1Officer } from '@/lib/server/auth';
import {
  completeComplaintByL1,
  markComplaintOnSiteByL1,
  markComplaintViewedByL1,
  markComplaintWorkStartedByL1,
} from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiL1Officer(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'viewed' | 'on_site' | 'work_started' | 'completed';
      note?: string;
    };

    if (body.action === 'viewed') {
      const result = await markComplaintViewedByL1(user, id);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'on_site') {
      const result = await markComplaintOnSiteByL1(user, id);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'work_started') {
      const result = await markComplaintWorkStartedByL1(user, id);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'completed') {
      const result = await completeComplaintByL1(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Unsupported L1 action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process L1 complaint action', error);
    return NextResponse.json({ error: 'Unable to process the L1 action right now.' }, { status: 500 });
  }
}
