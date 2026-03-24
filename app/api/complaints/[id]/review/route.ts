import { NextResponse } from 'next/server';

import { AuthError, requireApiOfficerUser } from '@/lib/server/auth';
import {
  closeComplaintByL2Review,
  remindL1OfficerFromL2,
  remindL1OfficerFromL3,
  remindL2OfficerFromL3,
  reopenComplaintFromL2Review,
} from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiOfficerUser(['L1', 'L2', 'L3'], request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: 'close' | 'reopen' | 'remind_l1' | 'remind_l2' | 'remind_l1_from_l3';
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

    if (body.action === 'remind_l1') {
      const result = await remindL1OfficerFromL2(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'remind_l2') {
      const result = await remindL2OfficerFromL3(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    if (body.action === 'remind_l1_from_l3') {
      const result = await remindL1OfficerFromL3(user, id, body.note);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Unsupported review action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process review action', error);
    return NextResponse.json({ error: 'Unable to process the review action right now.' }, { status: 500 });
  }
}
