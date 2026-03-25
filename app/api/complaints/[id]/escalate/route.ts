import { NextResponse } from 'next/server';

import { AuthError, requireApiL1Officer } from '@/lib/server/auth';
import { forwardComplaintToNextOfficer } from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiL1Officer(request);
    const { id } = await context.params;
    const escalation = await forwardComplaintToNextOfficer(user, id);
    return NextResponse.json({ success: true, escalation });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to forward complaint', error);
    return NextResponse.json({ error: 'Unable to forward complaint right now.' }, { status: 500 });
  }
}
