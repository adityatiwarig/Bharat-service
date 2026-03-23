import 'server-only';

import { listMappedWards } from '@/lib/grievance-mapping';
import { query } from '@/lib/server/db';
import type { Ward } from '@/lib/types';

type WardRow = {
  id: number;
  name: string;
  city: string;
  zone_id?: number | null;
  zone_name?: string | null;
  created_at: string;
};

export async function listWards() {
  try {
    const result = await query<WardRow>(
      `
        SELECT
          w.id,
          w.name,
          w.city,
          w.zone_id,
          z.name AS zone_name,
          w.created_at
        FROM wards w
        LEFT JOIN zones z ON z.id = w.zone_id
        ORDER BY w.id ASC
      `,
    );

    return result.rows as Ward[];
  } catch (error) {
    console.error('Falling back to grievance mapping wards', error);
    return listMappedWards();
  }
}
