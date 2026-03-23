import { NextResponse } from 'next/server';

import { AuthError, requireApiL3Officer } from '@/lib/server/auth';
import { markComplaintResolvedByL3 } from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiL3Officer(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { note?: string };

    await markComplaintResolvedByL3(user, id, body.note);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to resolve complaint through officer API', error);
    return NextResponse.json({ error: 'Unable to resolve complaint right now.' }, { status: 500 });
  }
}
