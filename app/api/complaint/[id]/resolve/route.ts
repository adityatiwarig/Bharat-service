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
      { error: 'This legacy L3 resolve action has been removed. L3 now handles monitoring and review decisions only.' },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to resolve complaint through officer API', error);
    return NextResponse.json({ error: 'Unable to resolve complaint right now.' }, { status: 500 });
  }
}
