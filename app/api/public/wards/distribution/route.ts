import { NextResponse } from 'next/server';

import { getPublicWardComplaintDistribution } from '@/lib/server/public-ward-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const summary = await getPublicWardComplaintDistribution();

    return NextResponse.json(
      { summary },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('Failed to load public ward distribution', error);
    return NextResponse.json({ error: 'Unable to load ward distribution right now.' }, { status: 500 });
  }
}
