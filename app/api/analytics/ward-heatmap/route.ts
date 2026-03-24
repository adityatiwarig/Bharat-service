import { NextResponse } from 'next/server';

import { getWardHeatmapData } from '@/lib/server/public-ward-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseNumber(value: string | null) {
  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const north = parseNumber(searchParams.get('north'));
    const south = parseNumber(searchParams.get('south'));
    const east = parseNumber(searchParams.get('east'));
    const west = parseNumber(searchParams.get('west'));
    const zoom = parseNumber(searchParams.get('zoom'));
    const data = await getWardHeatmapData({
      zoom,
      bounds: north !== null && south !== null && east !== null && west !== null
        ? { north, south, east, west }
        : null,
    });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to load ward heatmap analytics', error);
    return NextResponse.json({ error: 'Unable to load ward heatmap right now.' }, { status: 500 });
  }
}
