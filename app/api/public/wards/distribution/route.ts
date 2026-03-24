import { NextResponse } from 'next/server';

import { getPublicWardComplaintDistribution } from '@/lib/server/public-ward-distribution';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const summary = await getPublicWardComplaintDistribution();

    return NextResponse.json(
      { summary },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (error) {
    console.error('Failed to load public ward distribution', error);
    return NextResponse.json({ error: 'Unable to load ward distribution right now.' }, { status: 500 });
  }
}
