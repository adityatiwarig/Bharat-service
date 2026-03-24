import 'server-only';

import {
  getGrievanceMappingResponse as getStaticGrievanceMappingResponse,
  listMappedCategories,
  listMappedDepartments,
  listMappedWards,
  listZones as listStaticZones,
} from '@/lib/grievance-mapping';
import { query } from '@/lib/server/db';
import type {
  GrievanceCategoryOption,
  GrievanceDepartmentOption,
  GrievanceMappingResponse,
  Ward,
  Zone,
} from '@/lib/types';

type ZoneRow = {
  id: number;
  name: string;
};

type WardRow = {
  id: number;
  name: string;
  city: string;
  zone_id: number | null;
  zone_name: string | null;
  created_at: string;
};

type DepartmentRow = {
  id: number;
  name: string;
};

type CategoryRow = {
  id: number;
  name: string;
  department_id: number;
};

const SOURCE_FILE = 'database';

export async function getLiveGrievanceMappingResponse(
  input: { zoneId?: number | null; departmentId?: number | null } = {},
): Promise<GrievanceMappingResponse> {
  try {
    const [zonesResult, wardsResult, departmentsResult, categoriesResult] = await Promise.all([
      query<ZoneRow>(
        `
          SELECT id, name
          FROM zones
          ORDER BY id ASC
        `,
      ),
      query<WardRow>(
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
          ${input.zoneId ? 'WHERE w.zone_id = $1' : ''}
          ORDER BY w.id ASC
        `,
        input.zoneId ? [input.zoneId] : [],
      ),
      query<DepartmentRow>(
        `
          SELECT id, name
          FROM departments
          ORDER BY id ASC
        `,
      ),
      query<CategoryRow>(
        `
          SELECT id, name, department_id
          FROM categories
          ${input.departmentId ? 'WHERE department_id = $1' : ''}
          ORDER BY department_id ASC, id ASC
        `,
        input.departmentId ? [input.departmentId] : [],
      ),
    ]);

    const zones = zonesResult.rows as Zone[];
    const wards = wardsResult.rows as Ward[];
    const departments = departmentsResult.rows as GrievanceDepartmentOption[];
    const categories = categoriesResult.rows as GrievanceCategoryOption[];

    return {
      source_file: SOURCE_FILE,
      zones,
      wards,
      departments,
      categories,
      relationships: {
        wards_by_zone: Object.fromEntries(
          zones.map((zone) => [
            String(zone.id),
            wards.filter((ward) => ward.zone_id === zone.id).map((ward) => ward.id),
          ]),
        ),
        categories_by_department: Object.fromEntries(
          departments.map((department) => [
            String(department.id),
            categories.filter((category) => category.department_id === department.id).map((category) => category.id),
          ]),
        ),
      },
    };
  } catch (error) {
    console.error('Falling back to static grievance mapping', error);

    return {
      source_file: 'fallback-static',
      zones: listStaticZones(),
      wards: listMappedWards(input.zoneId),
      departments: listMappedDepartments(),
      categories: listMappedCategories(input.departmentId),
      relationships: getStaticGrievanceMappingResponse(input).relationships,
    };
  }
}
