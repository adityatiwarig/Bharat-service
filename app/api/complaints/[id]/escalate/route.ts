import { NextResponse } from 'next/server';

import { AuthError, requireApiForwardingOfficer } from '@/lib/server/auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiForwardingOfficer(request);
    void context;
    return NextResponse.json(
      { error: 'Manual forward workflow has been removed. Complaints now remain with L1 for field work while L2 and L3 operate through monitoring and review.' },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to forward complaint', error);
    return NextResponse.json({ error: 'Unable to forward complaint right now.' }, { status: 500 });
  }
}
