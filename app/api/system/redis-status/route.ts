import { NextResponse } from 'next/server';

import { getRedisStatus } from '@/lib/server/redis-cache';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getRedisStatus();

    return NextResponse.json(
      { redis: status },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('Failed to load Redis status', error);
    return NextResponse.json(
      {
        redis: {
          configured: false,
          available: false,
          mode: 'disabled',
          reason: 'Redis status check failed',
        },
      },
      { status: 500 },
    );
  }
}
