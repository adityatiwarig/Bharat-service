import { NextResponse } from 'next/server';

import { AuthError, requireApiExecutionOfficer } from '@/lib/server/auth';
import { uploadComplaintProofByL3 } from '@/lib/server/officer-routing';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiExecutionOfficer(request);
    const { id } = await context.params;
    const formData = await request.formData();
    const description = String(formData.get('description') || '').trim() || undefined;
    const image = formData.get('image');

    if (!(image instanceof File) || image.size <= 0) {
      return NextResponse.json({ error: 'Proof image is required.' }, { status: 400 });
    }

    const proof = await uploadComplaintProofByL3(user, id, {
      image,
      description,
    });

    return NextResponse.json({ success: true, proof });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to upload complaint proof', error);
    return NextResponse.json({ error: 'Unable to upload proof right now.' }, { status: 500 });
  }
}
