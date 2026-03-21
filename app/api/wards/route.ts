import { NextResponse } from 'next/server';

import { listWards } from '@/lib/server/wards';

export async function GET() {
  const wards = await listWards();
  return NextResponse.json({ wards });
}
