import 'server-only';

import type { DbTransactionClient } from '@/lib/server/db';

type OfficerRoleKey = 'L1' | 'L2' | 'L3';

export type ResolvedOfficerMapping = {
  id: number;
  zone_id: number;
  ward_id: number;
  department_id: number;
  category_id: number;
  zone_name: string;
  ward_name: string;
  department_name: string;
  category_name: string;
  l1_officer_id: string | null;
  l2_officer_id: string | null;
  l3_officer_id: string | null;
  sla_l1: number;
  sla_l2: number;
  sla_l3: number;
};

type OfficerMappingRow = ResolvedOfficerMapping;

function slugifyOfficerLoginPart(value: string, maxLength = 18) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength);
}

function buildOfficerLoginId(
  role: OfficerRoleKey,
  labels: Pick<ResolvedOfficerMapping, 'ward_name' | 'department_name' | 'category_name'>,
) {
  const wardSlug = slugifyOfficerLoginPart(labels.ward_name || `ward_${role.toLowerCase()}`);
  const departmentSlug = slugifyOfficerLoginPart(labels.department_name || 'department');
  const categorySlug = slugifyOfficerLoginPart(labels.category_name || 'category');

  return `${role.toLowerCase()}_${wardSlug}_${departmentSlug}_${categorySlug}`.slice(0, 96);
}

async function getOfficerMappingRow(
  client: DbTransactionClient,
  input: {
    zone_id: number;
    ward_id: number;
    department_id: number;
    category_id: number;
  },
) {
  const result = await client.query<OfficerMappingRow>(
    `
      SELECT
        om.id,
        om.zone_id,
        om.ward_id,
        om.department_id,
        om.category_id,
        z.name AS zone_name,
        w.name AS ward_name,
        d.name AS department_name,
        c.name AS category_name,
        om.l1_officer_id,
        om.l2_officer_id,
        om.l3_officer_id,
        om.sla_l1,
        om.sla_l2,
        om.sla_l3
      FROM officer_mapping om
      INNER JOIN zones z ON z.id = om.zone_id
      INNER JOIN wards w ON w.id = om.ward_id
      INNER JOIN departments d ON d.id = om.department_id
      INNER JOIN categories c ON c.id = om.category_id
      WHERE om.zone_id = $1
        AND om.ward_id = $2
        AND om.department_id = $3
        AND om.category_id = $4
      LIMIT 1
    `,
    [input.zone_id, input.ward_id, input.department_id, input.category_id],
  );

  return result.rows[0] || null;
}

async function getOfficerIdsByLoginIds(client: DbTransactionClient, loginIds: string[]) {
  const normalizedLoginIds = [...new Set(loginIds.map((value) => value.trim().toLowerCase()).filter(Boolean))];

  if (!normalizedLoginIds.length) {
    return new Map<string, string>();
  }

  const emails = normalizedLoginIds.map((loginId) => `${loginId}@crm.com`);
  const result = await client.query<{ id: string; email: string }>(
    `
      SELECT id, email
      FROM officers
      WHERE LOWER(email) = ANY($1::text[])
         OR LOWER(SPLIT_PART(email, '@', 1)) = ANY($2::text[])
    `,
    [emails, normalizedLoginIds],
  );

  const resolved = new Map<string, string>();

  for (const row of result.rows) {
    const email = String(row.email || '').trim().toLowerCase();
    const loginId = email.includes('@') ? email.split('@')[0] : email;

    if (loginId) {
      resolved.set(loginId, row.id);
    }
  }

  return resolved;
}

export async function getResolvedOfficerMapping(
  client: DbTransactionClient,
  input: {
    zone_id: number;
    ward_id: number;
    department_id: number;
    category_id: number;
  },
) {
  const mapping = await getOfficerMappingRow(client, input);

  if (!mapping) {
    return null;
  }

  const loginIds = {
    L1: buildOfficerLoginId('L1', mapping),
    L2: buildOfficerLoginId('L2', mapping),
    L3: buildOfficerLoginId('L3', mapping),
  } as const;

  const resolvedOfficerIds = await getOfficerIdsByLoginIds(client, Object.values(loginIds));
  const nextMapping = {
    ...mapping,
    l1_officer_id: resolvedOfficerIds.get(loginIds.L1) || mapping.l1_officer_id,
    l2_officer_id: resolvedOfficerIds.get(loginIds.L2) || mapping.l2_officer_id,
    l3_officer_id: resolvedOfficerIds.get(loginIds.L3) || mapping.l3_officer_id,
  };

  if (
    nextMapping.l1_officer_id !== mapping.l1_officer_id ||
    nextMapping.l2_officer_id !== mapping.l2_officer_id ||
    nextMapping.l3_officer_id !== mapping.l3_officer_id
  ) {
    await client.query(
      `
        UPDATE officer_mapping
        SET
          l1_officer_id = $2,
          l2_officer_id = $3,
          l3_officer_id = $4
        WHERE id = $1
      `,
      [
        mapping.id,
        nextMapping.l1_officer_id,
        nextMapping.l2_officer_id,
        nextMapping.l3_officer_id,
      ],
    );
  }

  return nextMapping;
}
