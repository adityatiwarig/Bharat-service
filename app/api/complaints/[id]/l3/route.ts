import { NextResponse } from 'next/server';

import { AuthError, requireApiL3Officer } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiL3Officer(request);
    void context;
    return NextResponse.json(
      { error: 'L3 field execution has been removed. L3 now handles monitoring and final review actions only.' },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process L3 complaint action', error);
    return NextResponse.json({ error: 'Unable to process the L3 action right now.' }, { status: 500 });
  }
}
