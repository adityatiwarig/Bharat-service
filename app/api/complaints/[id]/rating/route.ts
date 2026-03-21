import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { addComplaintRatingForUser } from '@/lib/server/complaints';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(['citizen']);
    const { id } = await context.params;
    const body = (await request.json()) as { rating?: number; feedback?: string };

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }

    const rating = await addComplaintRatingForUser(user, id, {
      rating: body.rating,
      feedback: body.feedback,
    });

    return NextResponse.json({ rating });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to submit rating', error);
    return NextResponse.json({ error: 'Unable to submit rating right now.' }, { status: 500 });
  }
}
