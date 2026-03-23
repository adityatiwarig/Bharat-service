import { NextResponse } from 'next/server';

import { AuthError, requireApiOfficerUser } from '@/lib/server/auth';
import { getOfficerDashboardSummary } from '@/lib/server/dashboard';

export async function GET(request: Request) {
  try {
    const user = await requireApiOfficerUser(['L1', 'L2', 'L3'], request);
    const summary = await getOfficerDashboardSummary(user);
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load officer dashboard', error);
    return NextResponse.json({ error: 'Unable to load dashboard right now.' }, { status: 500 });
  }
}
