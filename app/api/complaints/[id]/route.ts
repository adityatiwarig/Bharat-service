import { NextResponse } from 'next/server';

import { AuthError, requireApiUser } from '@/lib/server/auth';
import {
  closeComplaintByDeptHead,
  getComplaintByIdForUser,
  getComplaintSummaryForUser,
  reopenComplaintByDeptHead,
  updateComplaintStatusForUser,
} from '@/lib/server/complaints';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') === 'full' ? 'full' : 'summary';
    const complaint = view === 'full'
      ? await getComplaintByIdForUser(user, id, { view: 'full' })
      : await getComplaintSummaryForUser(user, id);

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { complaint },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to load complaint', error);
    return NextResponse.json({ error: 'Unable to load complaint right now.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(['worker', 'leader', 'admin']);
    const { id } = await context.params;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      if (user.role !== 'worker' && user.role !== 'admin') {
        return NextResponse.json({ error: 'Only workers can submit proof uploads.' }, { status: 403 });
      }

      const formData = await request.formData();
      const status = String(formData.get('status') || '').trim();
      const note = String(formData.get('note') || '').trim() || undefined;
      const proof_text = String(formData.get('proof_text') || '').trim() || undefined;
      const file = formData.get('proof_image');
      const proof_image = file instanceof File && file.size > 0 ? file : undefined;
      const proof_images = formData
        .getAll('proof_images')
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      if (!status) {
        return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
      }

      const complaint = await updateComplaintStatusForUser(user, id, {
        status: status as never,
        note,
        proof_text,
        proof_image,
        proof_images,
      });

      return NextResponse.json({ complaint });
    }

    const body = (await request.json()) as {
      action?: string;
      status?: string;
      note?: string;
      proof_text?: string;
    };

    if (body.action === 'close') {
      const complaint = await closeComplaintByDeptHead(user, id, body.note);
      return NextResponse.json({ complaint });
    }

    if (body.action === 'reopen') {
      const complaint = await reopenComplaintByDeptHead(user, id, body.note);
      return NextResponse.json({ complaint });
    }

    if (user.role !== 'worker' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only workers can update complaint execution status.' }, { status: 403 });
    }

    const status = String(body.status || '').trim();
    const note = body.note?.trim() || undefined;
    const proof_text = body.proof_text?.trim() || undefined;

    if (!status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
    }

    const complaint = await updateComplaintStatusForUser(user, id, {
      status: status as never,
      note,
      proof_text,
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to update complaint', error);
    return NextResponse.json({ error: 'Unable to update complaint right now.' }, { status: 500 });
  }
}
