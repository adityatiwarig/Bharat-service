import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getWorkerDashboardSummary } from '@/lib/server/dashboard';

export async function GET() {
  try {
    const user = await requireApiUser(['worker']);
    const summary = await getWorkerDashboardSummary(user);
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load worker dashboard', error);
    return NextResponse.json({ error: 'Unable to load dashboard right now.' }, { status: 500 });
  }
}
