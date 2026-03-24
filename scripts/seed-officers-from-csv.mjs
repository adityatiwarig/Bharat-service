import 'dotenv/config';

import { execFileSync } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import pg from 'pg';

const { Client } = pg;

const DEFAULT_PASSWORD = '123456';
const DEFAULT_ADMIN_EMAIL = 'admin@crm.com';
const CREDENTIALS_EXPORT_PATH = path.join(process.cwd(), 'OFFICER_LOGIN_CREDENTIALS.txt');
const CHUNK_SIZE = 250;

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function slugify(value, maxLength = 18) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug.slice(0, maxLength);
}

function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeMappingSlaMinutes(value) {
  const numeric = Math.max(1, Number(value) || 1);

  if (numeric < 60) {
    return numeric * 24 * 60;
  }

  return Math.ceil(numeric);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function normalizeRows(headers, rows) {
  const normalizedHeaders = headers.map(normalizeHeader);
  return rows.map((values) =>
    normalizedHeaders.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {}),
  );
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return normalizeRows(headers, rows);
}

function normalizePowerShellJson(data) {
  if (!data) {
    return [];
  }

  return Array.isArray(data) ? data : [data];
}

function readSpreadsheetWithPowerShell(sourcePath) {
  if (process.platform !== 'win32') {
    throw new Error('XLSX officer import is currently supported on Windows only. Convert the sheet to CSV first.');
  }

  const escapedPath = sourcePath.replace(/'/g, "''");
  const command = `
$ErrorActionPreference = 'Stop'
$sourcePath = '${escapedPath}'
$zipPath = Join-Path ([IO.Path]::GetTempPath()) ('smartcrm-' + [guid]::NewGuid().ToString() + '.zip')
$extractPath = Join-Path ([IO.Path]::GetTempPath()) ('smartcrm-' + [guid]::NewGuid().ToString())
Copy-Item -LiteralPath $sourcePath -Destination $zipPath -Force
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

function Get-CellValue($cell, $sharedStrings) {
  if ($null -eq $cell) { return '' }
  if ($cell.t -eq 's') { return [string]$sharedStrings[[int]$cell.v] }
  if ($cell.t -eq 'inlineStr') {
    if ($cell.is.t) { return [string]$cell.is.t.'#text' }
    return ''
  }
  return [string]$cell.v
}

function Get-ColumnIndex($reference) {
  $letters = ($reference -replace '\\d', '').ToUpperInvariant()
  $index = 0
  foreach ($char in $letters.ToCharArray()) {
    $index = ($index * 26) + ([int][char]$char - [int][char]'A' + 1)
  }
  return $index
}

[xml]$sheet = Get-Content -LiteralPath (Join-Path $extractPath 'xl\\worksheets\\sheet1.xml')
$sharedStringsPath = Join-Path $extractPath 'xl\\sharedStrings.xml'
$sharedStrings = @()

if (Test-Path -LiteralPath $sharedStringsPath) {
  [xml]$shared = Get-Content -LiteralPath $sharedStringsPath
  foreach ($si in $shared.sst.si) {
    $text = ''
    foreach ($node in $si.ChildNodes) {
      if ($node.Name -eq 't') {
        $text += $node.'#text'
      } elseif ($node.Name -eq 'r') {
        foreach ($child in $node.ChildNodes) {
          if ($child.Name -eq 't') {
            $text += $child.'#text'
          }
        }
      }
    }
    $sharedStrings += $text
  }
}

$headers = @()
$rows = @()

foreach ($row in $sheet.worksheet.sheetData.row) {
  $cellMap = @{}
  $maxIndex = 0

  foreach ($cell in $row.c) {
    $columnIndex = Get-ColumnIndex([string]$cell.r)
    if ($columnIndex -gt $maxIndex) {
      $maxIndex = $columnIndex
    }
    $cellMap[$columnIndex] = Get-CellValue $cell $sharedStrings
  }

  $ordered = @()
  for ($index = 1; $index -le $maxIndex; $index += 1) {
    $ordered += if ($cellMap.ContainsKey($index)) { [string]$cellMap[$index] } else { '' }
  }

  if (-not $headers.Count) {
    $headers = $ordered
    continue
  }

  $rowObject = [ordered]@{}
  for ($index = 0; $index -lt $headers.Count; $index += 1) {
    $header = [string]$headers[$index]
    if ([string]::IsNullOrWhiteSpace($header)) { continue }
    $rowObject[$header] = if ($index -lt $ordered.Count) { [string]$ordered[$index] } else { '' }
  }

  $rows += [pscustomobject]$rowObject
}

try {
  $rows | ConvertTo-Json -Depth 8 -Compress
}
finally {
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $extractPath) { Remove-Item -LiteralPath $extractPath -Recurse -Force -ErrorAction SilentlyContinue }
}
  `.trim();

  const raw = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  }).trim();

  const rows = normalizePowerShellJson(raw ? JSON.parse(raw) : []);

  if (!rows.length) {
    return [];
  }

  const headers = Object.keys(rows[0] || {});
  const values = rows.map((row) => headers.map((header) => String(row[header] ?? '')));
  return normalizeRows(headers, values);
}

async function loadRowsFromSource(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === '.csv') {
    const content = await readFile(sourcePath, 'utf8');
    return parseCsv(content);
  }

  if (extension === '.xlsx') {
    return readSpreadsheetWithPowerShell(path.resolve(sourcePath));
  }

  throw new Error('This seeder accepts CSV or XLSX files only.');
}

function pick(row, aliases) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return null;
}

function chunk(items, size = CHUNK_SIZE) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function loadReferenceMaps(client) {
  const zonesResult = await client.query(`SELECT id, name FROM zones`);
  const wardsResult = await client.query(`SELECT id, name FROM wards`);
  const departmentsResult = await client.query(`SELECT id, name FROM departments`);
  const categoriesResult = await client.query(`SELECT id, department_id, name FROM categories`);

  return {
    zonesById: new Map(zonesResult.rows.map((row) => [Number(row.id), row.name])),
    zonesByName: new Map(zonesResult.rows.map((row) => [normalizeLookupKey(row.name), Number(row.id)])),
    wardsById: new Map(wardsResult.rows.map((row) => [Number(row.id), row.name])),
    wardsByName: new Map(wardsResult.rows.map((row) => [normalizeLookupKey(row.name), Number(row.id)])),
    departmentsById: new Map(departmentsResult.rows.map((row) => [Number(row.id), row.name])),
    departmentsByName: new Map(departmentsResult.rows.map((row) => [normalizeLookupKey(row.name), Number(row.id)])),
    categoriesById: new Map(categoriesResult.rows.map((row) => [Number(row.id), row.name])),
    categoriesByScope: new Map(
      categoriesResult.rows.map((row) => [
        `${Number(row.department_id)}:${normalizeLookupKey(row.name)}`,
        Number(row.id),
      ]),
    ),
  };
}

function resolveMappedIds(row, referenceMaps) {
  const zoneIdRaw = pick(row, ['zone_id', 'zone']);
  const wardIdRaw = pick(row, ['ward_id', 'ward']);
  const departmentIdRaw = pick(row, ['department_id', 'department']);
  const categoryIdRaw = pick(row, ['category_id', 'category']);

  const zoneName = pick(row, ['zone_name', 'zone']);
  const wardName = pick(row, ['ward_name', 'ward']);
  const departmentName = pick(row, ['department_name', 'department']);
  const categoryName = pick(row, ['category_name', 'category']);

  const zone_id = zoneIdRaw && /^\d+$/.test(zoneIdRaw)
    ? Number(zoneIdRaw)
    : zoneName
      ? referenceMaps.zonesByName.get(normalizeLookupKey(zoneName)) ?? null
      : null;

  const ward_id = wardIdRaw && /^\d+$/.test(wardIdRaw)
    ? Number(wardIdRaw)
    : wardName
      ? referenceMaps.wardsByName.get(normalizeLookupKey(wardName)) ?? null
      : null;

  const department_id = departmentIdRaw && /^\d+$/.test(departmentIdRaw)
    ? Number(departmentIdRaw)
    : departmentName
      ? referenceMaps.departmentsByName.get(normalizeLookupKey(departmentName)) ?? null
      : null;

  let category_id = categoryIdRaw && /^\d+$/.test(categoryIdRaw) ? Number(categoryIdRaw) : null;

  if (!category_id && categoryName && department_id) {
    category_id = referenceMaps.categoriesByScope.get(
      `${department_id}:${normalizeLookupKey(categoryName)}`,
    ) ?? null;
  }

  if (!zone_id || !ward_id || !department_id || !category_id) {
    throw new Error(`Unable to resolve mapping row ids for ${JSON.stringify(row)}`);
  }

  return {
    zone_id,
    ward_id,
    department_id,
    category_id,
    labels: {
      zone_name: zoneName || referenceMaps.zonesById.get(zone_id) || `zone_${zone_id}`,
      ward_name: wardName || referenceMaps.wardsById.get(ward_id) || `ward_${ward_id}`,
      department_name: departmentName || referenceMaps.departmentsById.get(department_id) || `department_${department_id}`,
      category_name: categoryName || referenceMaps.categoriesById.get(category_id) || `category_${category_id}`,
    },
  };
}

function buildOfficerLoginId(role, resolved) {
  const prefix = role.toLowerCase();
  const wardSlug = slugify(resolved.labels.ward_name || `ward_${resolved.ward_id}`);
  const departmentSlug = slugify(resolved.labels.department_name || `department_${resolved.department_id}`);
  const categorySlug = slugify(resolved.labels.category_name || `category_${resolved.category_id}`);
  return `${prefix}_${wardSlug}_${departmentSlug}_${categorySlug}`.slice(0, 96);
}

function buildOfficerSeedData(role, row, resolved, passwordHash) {
  const prefix = role.toLowerCase();
  const login_id = buildOfficerLoginId(role, resolved);

  return {
    role,
    login_id,
    email: `${login_id}@crm.com`,
    name:
      pick(row, [`${prefix}_officer`, `${prefix}_name`]) ||
      `${resolved.labels.ward_name} ${resolved.labels.department_name} ${resolved.labels.category_name} ${role} Officer`,
    designation: pick(row, [`${prefix}_designation`, `${prefix}_title`]),
    zone_id: resolved.zone_id,
    ward_id: resolved.ward_id,
    department_id: resolved.department_id,
    password: passwordHash,
    password_plain: DEFAULT_PASSWORD,
    zone_name: resolved.labels.zone_name,
    ward_name: resolved.labels.ward_name,
    department_name: resolved.labels.department_name,
    category_name: resolved.labels.category_name,
  };
}

function buildBulkValues(rows, columns, valueBuilder) {
  const params = [];
  const values = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      params.push(valueBuilder(row, column));
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });

    return `(${placeholders.join(', ')})`;
  });

  return { values, params };
}

async function bulkUpsertUsers(client, officers) {
  const columns = ['name', 'email', 'password', 'role'];

  for (const group of chunk(officers)) {
    const { values, params } = buildBulkValues(group, columns, (officer, column) => {
      if (column === 'role') {
        return officer.role === 'ADMIN' ? 'admin' : 'worker';
      }

      return officer[column];
    });

    await client.query(
      `
        INSERT INTO users (name, email, password, role)
        VALUES ${values.join(', ')}
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          updated_at = NOW()
      `,
      params,
    );
  }
}

async function loadUserIdByEmail(client, emails) {
  const resultMap = new Map();

  for (const group of chunk(emails)) {
    const result = await client.query(
      `
        SELECT id, email
        FROM users
        WHERE LOWER(email) = ANY($1::text[])
      `,
      [group.map((email) => email.toLowerCase())],
    );

    for (const row of result.rows) {
      resultMap.set(String(row.email).toLowerCase(), row.id);
    }
  }

  return resultMap;
}

async function bulkUpsertOfficers(client, officers, userIdsByEmail) {
  const columns = ['user_id', 'name', 'email', 'password', 'role', 'zone_id', 'ward_id', 'department_id', 'designation'];

  for (const group of chunk(officers)) {
    const { values, params } = buildBulkValues(group, columns, (officer, column) => {
      if (column === 'user_id') {
        return userIdsByEmail.get(officer.email.toLowerCase()) || null;
      }

      return officer[column] ?? null;
    });

    await client.query(
      `
        INSERT INTO officers (
          user_id,
          name,
          email,
          password,
          role,
          zone_id,
          ward_id,
          department_id,
          designation
        )
        VALUES ${values
          .map((value, index) => {
            const base = index * columns.length;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::officer_role, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
          })
          .join(', ')}
        ON CONFLICT (email)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          zone_id = EXCLUDED.zone_id,
          ward_id = EXCLUDED.ward_id,
          department_id = EXCLUDED.department_id,
          designation = EXCLUDED.designation,
          updated_at = NOW()
      `,
      params,
    );
  }
}

async function loadOfficerMapByEmail(client, emails) {
  const resultMap = new Map();

  for (const group of chunk(emails)) {
    const result = await client.query(
      `
        SELECT id, user_id, email
        FROM officers
        WHERE LOWER(email) = ANY($1::text[])
      `,
      [group.map((email) => email.toLowerCase())],
    );

    for (const row of result.rows) {
      resultMap.set(String(row.email).toLowerCase(), {
        officerId: row.id,
        userId: row.user_id,
      });
    }
  }

  return resultMap;
}

async function bulkUpsertMappings(client, mappings) {
  const columns = [
    'zone_id',
    'ward_id',
    'department_id',
    'category_id',
    'l1_officer_id',
    'l2_officer_id',
    'l3_officer_id',
    'sla_l1',
    'sla_l2',
    'sla_l3',
  ];

  for (const group of chunk(mappings)) {
    const { values, params } = buildBulkValues(group, columns, (mapping, column) => mapping[column]);

    await client.query(
      `
        INSERT INTO officer_mapping (
          zone_id,
          ward_id,
          department_id,
          category_id,
          l1_officer_id,
          l2_officer_id,
          l3_officer_id,
          sla_l1,
          sla_l2,
          sla_l3
        )
        VALUES ${values.join(', ')}
        ON CONFLICT (zone_id, ward_id, department_id, category_id)
        DO UPDATE SET
          l1_officer_id = EXCLUDED.l1_officer_id,
          l2_officer_id = EXCLUDED.l2_officer_id,
          l3_officer_id = EXCLUDED.l3_officer_id,
          sla_l1 = EXCLUDED.sla_l1,
          sla_l2 = EXCLUDED.sla_l2,
          sla_l3 = EXCLUDED.sla_l3
      `,
      params,
    );
  }
}

function compareCredentialRows(a, b) {
  return (
    a.ward_name.localeCompare(b.ward_name) ||
    a.department_name.localeCompare(b.department_name) ||
    a.category_name.localeCompare(b.category_name) ||
    a.role.localeCompare(b.role) ||
    a.login_id.localeCompare(b.login_id)
  );
}

function buildCredentialsText(entries, sourcePath) {
  const lines = [
    'SMARTCRM OFFICER LOGIN CREDENTIALS',
    '==================================',
    '',
    `Source File: ${sourcePath}`,
    `Generated At: ${new Date().toISOString()}`,
    '',
    'Login Instructions',
    '------------------',
    '1. You can log in using either Login ID or full email.',
    `2. Default password for seeded officers: ${DEFAULT_PASSWORD}`,
    '3. Login page: /worker-login',
    '',
  ];

  for (const entry of [...entries].sort(compareCredentialRows)) {
    lines.push(`${entry.role} | ${entry.ward_name} | ${entry.department_name} | ${entry.category_name}`);
    lines.push(`Officer Name: ${entry.name}`);
    if (entry.designation) {
      lines.push(`Designation: ${entry.designation}`);
    }
    lines.push(`Login ID: ${entry.login_id}`);
    lines.push(`Email: ${entry.email}`);
    lines.push(`Password: ${entry.password}`);
    if (entry.officer_id) {
      lines.push(`Officer UUID: ${entry.officer_id}`);
    }
    if (entry.user_id) {
      lines.push(`User UUID: ${entry.user_id}`);
    }
    lines.push('');
  }

  return lines.join(os.EOL);
}

async function main() {
  const sourcePath = process.argv[2];

  if (!sourcePath) {
    throw new Error('Usage: node scripts/seed-officers-from-csv.mjs <path-to-csv-or-xlsx>');
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const rows = await loadRowsFromSource(sourcePath);

  if (!rows.length) {
    throw new Error('No mapping rows found in the spreadsheet.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  let createdOrUpdatedMappings = 0;

  try {
    const referenceMaps = await loadReferenceMaps(client);
    const officerSeedsByEmail = new Map();
    const mappingSeeds = [];
    let defaultAdminDepartmentId = null;

    for (const row of rows) {
      const resolved = resolveMappedIds(row, referenceMaps);
      defaultAdminDepartmentId ||= resolved.department_id;

      const officerSeeds = ['L1', 'L2', 'L3'].map((role) => buildOfficerSeedData(role, row, resolved, passwordHash));

      for (const officer of officerSeeds) {
        officerSeedsByEmail.set(officer.email.toLowerCase(), officer);
      }

      mappingSeeds.push({
        zone_id: resolved.zone_id,
        ward_id: resolved.ward_id,
        department_id: resolved.department_id,
        category_id: resolved.category_id,
        l1_email: officerSeeds[0].email,
        l2_email: officerSeeds[1].email,
        l3_email: officerSeeds[2].email,
        sla_l1: normalizeMappingSlaMinutes(pick(row, ['sla_l1']) || 1),
        sla_l2: normalizeMappingSlaMinutes(pick(row, ['sla_l2']) || 1),
        sla_l3: normalizeMappingSlaMinutes(pick(row, ['sla_l3']) || 1),
      });
    }

    const officerSeeds = [...officerSeedsByEmail.values()];
    const adminSeed = {
      role: 'ADMIN',
      login_id: 'admin',
      email: DEFAULT_ADMIN_EMAIL,
      name: 'System Admin Officer',
      designation: 'System Administrator',
      zone_id: null,
      ward_id: null,
      department_id: defaultAdminDepartmentId,
      password: passwordHash,
      password_plain: DEFAULT_PASSWORD,
      zone_name: 'All Zones',
      ward_name: 'All Wards',
      department_name: 'System',
      category_name: 'Administrative Access',
    };

    if (defaultAdminDepartmentId) {
      officerSeeds.push(adminSeed);
    }

    await client.query('BEGIN');

    await bulkUpsertUsers(client, officerSeeds);
    const userIdsByEmail = await loadUserIdByEmail(client, officerSeeds.map((item) => item.email));

    await bulkUpsertOfficers(client, officerSeeds, userIdsByEmail);
    const officersByEmail = await loadOfficerMapByEmail(client, officerSeeds.map((item) => item.email));

    const mappings = mappingSeeds.map((mapping) => {
      const l1 = officersByEmail.get(mapping.l1_email.toLowerCase());
      const l2 = officersByEmail.get(mapping.l2_email.toLowerCase());
      const l3 = officersByEmail.get(mapping.l3_email.toLowerCase());

      if (!l1?.officerId || !l2?.officerId || !l3?.officerId) {
        throw new Error(`Failed to resolve officer ids for mapping ${mapping.zone_id}/${mapping.ward_id}/${mapping.department_id}/${mapping.category_id}`);
      }

      return {
        zone_id: mapping.zone_id,
        ward_id: mapping.ward_id,
        department_id: mapping.department_id,
        category_id: mapping.category_id,
        l1_officer_id: l1.officerId,
        l2_officer_id: l2.officerId,
        l3_officer_id: l3.officerId,
        sla_l1: mapping.sla_l1,
        sla_l2: mapping.sla_l2,
        sla_l3: mapping.sla_l3,
      };
    });

    await bulkUpsertMappings(client, mappings);
    await client.query('COMMIT');

    createdOrUpdatedMappings = mappings.length;

    const credentialEntries = officerSeeds.map((officer) => {
      const saved = officersByEmail.get(officer.email.toLowerCase());
      const savedUserId = userIdsByEmail.get(officer.email.toLowerCase()) || saved?.userId || null;

      return {
        role: officer.role,
        name: officer.name,
        designation: officer.designation,
        login_id: officer.login_id,
        email: officer.email,
        password: officer.password_plain,
        officer_id: saved?.officerId || null,
        user_id: savedUserId,
        zone_name: officer.zone_name,
        ward_name: officer.ward_name,
        department_name: officer.department_name,
        category_name: officer.category_name,
      };
    });

    await writeFile(
      CREDENTIALS_EXPORT_PATH,
      buildCredentialsText(credentialEntries, sourcePath),
      'utf8',
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    throw error;
  } finally {
    await client.end();
  }

  console.log(`Seeded officer accounts and mappings from ${createdOrUpdatedMappings} rows.`);
  console.log(`Credentials file written to: ${CREDENTIALS_EXPORT_PATH}`);
  console.log(`Default officer password: ${DEFAULT_PASSWORD}`);
  console.log('Officer login now supports either login ID or full email.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
