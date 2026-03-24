import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import { addComplaintRatingForUser } from '@/lib/server/complaints';
import type { ComplaintSatisfaction } from '@/lib/types';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(['citizen']);
    const { id } = await context.params;
    const body = (await request.json()) as {
      rating?: number;
      satisfaction?: ComplaintSatisfaction;
      feedback?: string;
    };
    const normalizedRating = body.satisfaction === 'satisfied'
      ? 5
      : body.satisfaction === 'not_satisfied'
        ? 1
        : body.rating;

    if (!normalizedRating || normalizedRating < 1 || normalizedRating > 5) {
      return NextResponse.json({ error: 'Feedback must be Satisfied, Not satisfied, or a rating between 1 and 5.' }, { status: 400 });
    }

    const rating = await addComplaintRatingForUser(user, id, {
      rating: normalizedRating,
      satisfaction: body.satisfaction,
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
