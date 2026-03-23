import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/server/auth';
import { getPublicComplaintByTrackingCode } from '@/lib/server/complaints';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ trackingCode: string }> },
) {
  try {
    const user = await getCurrentUser();
    const { trackingCode } = await context.params;
    const complaint = await getPublicComplaintByTrackingCode(trackingCode, user);

    if (!complaint) {
      return NextResponse.json({ error: 'No complaint found with this tracking ID' }, { status: 404 });
    }

    return NextResponse.json(complaint, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Failed to load public complaint tracking details', error);
    return NextResponse.json({ error: 'Unable to load complaint tracking right now.' }, { status: 500 });
  }
}
