import 'server-only';

import { DELHI_WARDS } from '@/lib/constants';
import { query } from '@/lib/server/db';
import type { Ward } from '@/lib/types';

type WardRow = {
  id: number;
  name: string;
  city: string;
  created_at: string;
};

export async function listWards() {
  try {
    const result = await query<WardRow>(
      `
        SELECT id, name, city, created_at
        FROM wards
        ORDER BY id ASC
      `,
    );

    return result.rows as Ward[];
  } catch (error) {
    console.error('Falling back to static Delhi wards', error);
    return DELHI_WARDS;
  }
}
