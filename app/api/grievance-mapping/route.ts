import { NextResponse } from 'next/server';

import { getGrievanceMappingResponse } from '@/lib/grievance-mapping';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get('zoneId');
  const departmentId = searchParams.get('departmentId');

  const mapping = getGrievanceMappingResponse({
    zoneId: zoneId ? Number(zoneId) : undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
  });

  return NextResponse.json(mapping);
}
