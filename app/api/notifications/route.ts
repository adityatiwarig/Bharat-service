import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import {
  listNotificationsForUser,
  markNotificationsReadForUser,
} from '@/lib/server/notifications';

export async function GET() {
  try {
    const user = await requireApiUser(['worker', 'admin', 'leader']);
    const data = await listNotificationsForUser(user);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load notifications', error);
    return NextResponse.json({ error: 'Unable to load notifications right now.' }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await requireApiUser(['worker', 'admin', 'leader']);
    await markNotificationsReadForUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to update notifications', error);
    return NextResponse.json({ error: 'Unable to update notifications right now.' }, { status: 500 });
  }
}
