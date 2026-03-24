import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { processDueComplaintEscalations } from '@/lib/server/complaint-escalations';

export async function POST() {
  try {
    await requireApiUser(['admin']);
    const results = await processDueComplaintEscalations(25);
    return NextResponse.json({
      success: true,
      processed: results.length,
      locked: results.filter((item) => item.action === 'locked').length,
      escalated: results.filter((item) => item.action === 'escalated').length,
      results,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to process escalation queue', error);
    return NextResponse.json({ error: 'Unable to process escalation queue right now.' }, { status: 500 });
  }
}
