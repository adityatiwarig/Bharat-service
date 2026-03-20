import { NextRequest, NextResponse } from 'next/server';

import { getComplaintById } from '@/lib/server/complaints-store';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const complaint = await getComplaintById(id);

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
  }

  return NextResponse.json({ complaint });
}
