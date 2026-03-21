import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { getAdminDashboardSummary } from '@/lib/server/dashboard';

export async function GET() {
  try {
    await requireApiUser(['admin', 'leader']);
    const summary = await getAdminDashboardSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load admin dashboard', error);
    return NextResponse.json({ error: 'Unable to load dashboard right now.' }, { status: 500 });
  }
}
