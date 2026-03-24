import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import {
  listNotificationsForUser,
  markNotificationsReadForUser,
  markSelectedNotificationsReadForUser,
} from '@/lib/server/notifications';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireApiUser();
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

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] };

    if (Array.isArray(body.ids) && body.ids.length) {
      await markSelectedNotificationsReadForUser(user, body.ids);
    } else {
      await markNotificationsReadForUser(user);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to update notifications', error);
    return NextResponse.json({ error: 'Unable to update notifications right now.' }, { status: 500 });
  }
}
