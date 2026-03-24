import { NextResponse } from 'next/server';

import { AuthError, requireApiL1Officer } from '@/lib/server/auth';
import { uploadComplaintProofByL1 } from '@/lib/server/officer-routing';
import type { GeoEvidenceMetadata } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiL1Officer(request);
    const { id } = await context.params;
    const formData = await request.formData();
    const description = String(formData.get('description') || '').trim() || undefined;
    const image = formData.get('image');
    const imageOriginal = formData.get('image_original');
    const imageMetadataRaw = String(formData.get('image_metadata') || '').trim();

    if (!(image instanceof File) || image.size <= 0) {
      return NextResponse.json({ error: 'Proof image is required.' }, { status: 400 });
    }

    let imageMetadata: GeoEvidenceMetadata | undefined;
    if (imageMetadataRaw) {
      try {
        imageMetadata = JSON.parse(imageMetadataRaw) as GeoEvidenceMetadata;
      } catch {
        imageMetadata = undefined;
      }
    }

    const proof = await uploadComplaintProofByL1(user, id, {
      image,
      description,
      originalImage: imageOriginal instanceof File && imageOriginal.size > 0 ? imageOriginal : undefined,
      metadata: imageMetadata,
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
