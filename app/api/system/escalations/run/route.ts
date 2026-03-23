import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';

export async function POST() {
  try {
    await requireApiUser(['admin']);
    return NextResponse.json(
      {
        error: 'Automatic SLA escalation is disabled. Use the officer forward API instead.',
      },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process escalation queue', error);
    return NextResponse.json({ error: 'Unable to process escalation queue right now.' }, { status: 500 });
  }
}
