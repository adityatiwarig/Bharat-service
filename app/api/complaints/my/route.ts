import { NextResponse } from 'next/server';

import { AuthError, requireApiOfficerUser } from '@/lib/server/auth';
import { listComplaintsForOfficer } from '@/lib/server/officer-routing';

export async function GET(request: Request) {
  try {
    const user = await requireApiOfficerUser(['L1', 'L2', 'L3'], request);
    const complaints = await listComplaintsForOfficer(user);
    return NextResponse.json({ complaints });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load officer complaints', error);
    return NextResponse.json({ error: 'Unable to load officer complaints right now.' }, { status: 500 });
  }
}
