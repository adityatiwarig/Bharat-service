import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { listUsersForAdmin } from '@/lib/server/users';

export async function GET() {
  try {
    await requireApiUser(['admin', 'leader']);
    const users = await listUsersForAdmin();
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load users', error);
    return NextResponse.json({ error: 'Unable to load users right now.' }, { status: 500 });
  }
}
