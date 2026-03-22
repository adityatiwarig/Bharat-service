import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getLeaderTrendSummary } from '@/lib/server/leader-trends';

export async function GET() {
  try {
    const user = await requireApiUser(['leader']);
    const summary = await getLeaderTrendSummary(user);
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load leader trends', error);
    return NextResponse.json({ error: 'Unable to load trends right now.' }, { status: 500 });
  }
}
