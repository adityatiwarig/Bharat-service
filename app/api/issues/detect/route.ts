import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { detectRecentIssueGroupForUser } from '@/lib/server/complaints';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(['citizen']);
    const { searchParams } = new URL(request.url);
    const wardId = Number(searchParams.get('wardId') || 0);
    const categoryId = Number(searchParams.get('categoryId') || 0);

    if (!Number.isFinite(wardId) || wardId <= 0 || !Number.isFinite(categoryId) || categoryId <= 0) {
      return NextResponse.json({ issue: null });
    }

    const issue = await detectRecentIssueGroupForUser(user, { wardId, categoryId });
    return NextResponse.json({ issue });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to detect issue group', error);
    return NextResponse.json({ error: 'Unable to detect a similar issue right now.' }, { status: 500 });
  }
}
