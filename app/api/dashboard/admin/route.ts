import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getAdminDashboardSummary } from '@/lib/server/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(['admin', 'leader']);
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const summary = await getAdminDashboardSummary(user, {
      zoneId: zoneId ? Number(zoneId) : undefined,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load admin dashboard', error);
    return NextResponse.json({ error: 'Unable to load dashboard right now.' }, { status: 500 });
  }
}
