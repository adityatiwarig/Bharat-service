import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getLeaderWardComparisonSummary } from '@/lib/server/dashboard';

export async function GET() {
  try {
    const user = await requireApiUser(['leader']);
    const summary = await getLeaderWardComparisonSummary(user);
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load leader ward comparison', error);
    return NextResponse.json({ error: 'Unable to load ward comparison right now.' }, { status: 500 });
  }
}
