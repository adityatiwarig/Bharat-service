import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import net from 'node:net';
import tls from 'node:tls';

import { config as loadEnv } from 'dotenv';
import pg from 'pg';

for (const envFile of ['.env', '.env.local']) {
  const envPath = resolve(process.cwd(), envFile);

  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: envFile === '.env.local' });
  }
}

const { Pool } = pg;
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
const REDIS_REST_URL = process.env.REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_REST_TOKEN = process.env.REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const REDIS_URL = process.env.REDIS_URL || '';
const ESCALATION_QUEUE_KEY = 'complaint:escalation:due';
const LOOP_INTERVAL_MS = 10000;
const REQUEST_TIMEOUT_MS = 1000;

console.log('Automatic SLA escalation is disabled. Manual officer forwarding is now the only escalation path.');
process.exit(0);

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or DIRECT_URL is required.');
}

const pool = new Pool({ connectionString: DATABASE_URL });

function getRedisMode() {
  if (REDIS_REST_URL && REDIS_REST_TOKEN) {
    return 'rest';
  }

  if (REDIS_URL) {
    return 'tcp';
  }

  return 'disabled';
}

function parseRedisUrl() {
  if (!REDIS_URL) {
    return null;
  }

  const parsed = new URL(REDIS_URL);
  const secure = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: Number(parsed.port || (secure ? 6380 : 6379)),
    password: parsed.password || undefined,
    database: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined,
    secure,
  };
}

function serializeRedisCommand(command) {
  const parts = [`*${command.length}\r\n`];

  for (const arg of command) {
    const value = String(arg);
    parts.push(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
  }

  return Buffer.from(parts.join(''), 'utf8');
}

function parseRedisReply(buffer, offset = 0) {
  if (offset >= buffer.length) {
    return null;
  }

  const prefix = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf('\r\n', offset);

  if (lineEnd === -1) {
    return null;
  }

  const line = buffer.toString('utf8', offset + 1, lineEnd);

  if (prefix === '+') {
    return { value: line, nextOffset: lineEnd + 2 };
  }

  if (prefix === '-') {
    throw new Error(line);
  }

  if (prefix === ':') {
    return { value: Number(line), nextOffset: lineEnd + 2 };
  }

  if (prefix === '$') {
    const length = Number(line);

    if (length === -1) {
      return { value: null, nextOffset: lineEnd + 2 };
    }

    const start = lineEnd + 2;
    const end = start + length;

    if (buffer.length < end + 2) {
      return null;
    }

    return {
      value: buffer.toString('utf8', start, end),
      nextOffset: end + 2,
    };
  }

  if (prefix === '*') {
    const count = Number(line);
    let nextOffset = lineEnd + 2;
    const values = [];

    for (let index = 0; index < count; index += 1) {
      const parsed = parseRedisReply(buffer, nextOffset);

      if (!parsed) {
        return null;
      }

      values.push(parsed.value);
      nextOffset = parsed.nextOffset;
    }

    return { value: values, nextOffset };
  }

  throw new Error('Unsupported Redis response');
}

async function runRedisCommand(command) {
  const mode = getRedisMode();

  if (mode === 'disabled') {
    return null;
  }

  if (mode === 'rest') {
    const response = await fetch(REDIS_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload = await response.json();
    return payload.result ?? null;
  }

  const config = parseRedisUrl();

  if (!config) {
    return null;
  }

  return new Promise((resolvePromise, reject) => {
    const socket = config.secure
      ? tls.connect({ host: config.host, port: config.port, servername: config.host })
      : net.createConnection({ host: config.host, port: config.port });
    const chunks = [];
    const commands = [];

    if (config.password) {
      commands.push(serializeRedisCommand(['AUTH', config.password]));
    }

    if (Number.isFinite(config.database)) {
      commands.push(serializeRedisCommand(['SELECT', config.database]));
    }

    commands.push(serializeRedisCommand(command));

    socket.setTimeout(REQUEST_TIMEOUT_MS, () => reject(new Error('Redis timeout')));
    socket.on('connect', () => socket.write(Buffer.concat(commands)));
    socket.on('error', reject);
    socket.on('data', (chunk) => {
      chunks.push(chunk);

      try {
        const combined = Buffer.concat(chunks);
        const replies = [];
        let offset = 0;

        while (offset < combined.length && replies.length < commands.length) {
          const parsed = parseRedisReply(combined, offset);

          if (!parsed) {
            return;
          }

          replies.push(parsed.value);
          offset = parsed.nextOffset;
        }

        if (replies.length === commands.length) {
          socket.destroy();
          resolvePromise(replies[replies.length - 1] ?? null);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function claimDueComplaintIds(limit = 25) {
  const ids = await runRedisCommand([
    'ZRANGEBYSCORE',
    ESCALATION_QUEUE_KEY,
    '-inf',
    Date.now(),
    'LIMIT',
    0,
    limit,
  ]);

  if (!Array.isArray(ids) || !ids.length) {
    return [];
  }

  const claimed = [];

  for (const complaintId of ids) {
    const removed = await runRedisCommand(['ZREM', ESCALATION_QUEUE_KEY, complaintId]);

    if (removed) {
      claimed.push(complaintId);
    }
  }

  return claimed;
}

async function scheduleComplaint(complaintId, deadline) {
  await runRedisCommand(['ZADD', ESCALATION_QUEUE_KEY, new Date(deadline).getTime(), complaintId]);
}

async function createNotification(client, input) {
  await client.query(
    `
      INSERT INTO notifications (user_id, complaint_id, title, message, href)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [input.user_id, input.complaint_id || null, input.title, input.message, input.href || null],
  );
}

async function processComplaintEscalation(complaintId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const complaintResult = await client.query(
      `
        SELECT
          c.id,
          c.complaint_id,
          c.title,
          c.user_id,
          c.zone_id,
          c.ward_id,
          c.department_id,
          c.category_id,
          c.assigned_officer_id,
          c.current_level,
          c.status
        FROM complaints c
        WHERE c.id = $1
        LIMIT 1
      `,
      [complaintId],
    );

    const complaint = complaintResult.rows[0];

    if (!complaint || ['resolved', 'closed', 'rejected'].includes(complaint.status)) {
      await client.query('COMMIT');
      return { complaint_id: complaintId, action: 'cleared' };
    }

    const mappingResult = await client.query(
      `
        SELECT
          l1_officer_id,
          l2_officer_id,
          l3_officer_id,
          sla_l1,
          sla_l2,
          sla_l3
        FROM officer_mapping
        WHERE zone_id = $1
          AND ward_id = $2
          AND department_id = $3
          AND category_id = $4
        LIMIT 1
      `,
      [complaint.zone_id, complaint.ward_id, complaint.department_id, complaint.category_id],
    );

    const mapping = mappingResult.rows[0];

    if (!mapping) {
      await client.query('COMMIT');
      return { complaint_id: complaintId, action: 'cleared' };
    }

    let nextLevel = null;
    let nextOfficerId = null;
    let nextSla = null;

    if (complaint.current_level === 'L1') {
      nextLevel = 'L2';
      nextOfficerId = mapping.l2_officer_id;
      nextSla = Number(mapping.sla_l2);
    } else if (complaint.current_level === 'L2') {
      nextLevel = 'L3';
      nextOfficerId = mapping.l3_officer_id;
      nextSla = Number(mapping.sla_l3);
    }

    if (!nextLevel || !nextOfficerId || !nextSla || complaint.assigned_officer_id === nextOfficerId) {
      await client.query('COMMIT');
      return { complaint_id: complaintId, action: 'cleared' };
    }

    const deadline = new Date(Date.now() + nextSla * 60 * 1000).toISOString();
    const officerResult = await client.query(
      `
        SELECT id, user_id, name
        FROM officers
        WHERE id = $1
        LIMIT 1
      `,
      [nextOfficerId],
    );
    const officer = officerResult.rows[0];

    await client.query(
      `
        UPDATE complaints
        SET
          assigned_officer_id = $2,
          current_level = $3,
          deadline = $4,
          status = 'assigned',
          progress = 'pending',
          updated_at = NOW(),
          department_message = $5
        WHERE id = $1
      `,
      [
        complaint.id,
        nextOfficerId,
        nextLevel,
        deadline,
        `Complaint escalated to ${nextLevel} and reassigned to the mapped officer.`,
      ],
    );

    await client.query(
      `
        INSERT INTO complaint_updates (complaint_id, status, note)
        VALUES ($1, 'assigned', $2)
      `,
      [complaint.id, `Complaint escalated automatically to ${nextLevel}.`],
    );

    await client.query(
      `
        INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
        VALUES ($1, 'escalated', $2, $3, $4)
      `,
      [complaint.id, complaint.assigned_officer_id, nextOfficerId, nextLevel],
    );

    if (officer?.user_id) {
      await createNotification(client, {
        user_id: officer.user_id,
        complaint_id: complaint.id,
        title: 'Complaint escalated to you',
        message: `${complaint.title} has been escalated to your queue at ${nextLevel}.`,
        href: '/officer/complaints',
      });
    }

    await createNotification(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint escalated',
      message: `${complaint.title} has been escalated to ${nextLevel} for further action.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    await client.query('COMMIT');
    await scheduleComplaint(complaint.id, deadline);

    return { complaint_id: complaint.id, action: 'escalated', next_deadline: deadline };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runOnce() {
  const complaintIds = await claimDueComplaintIds(25);

  if (!complaintIds.length) {
    console.log('No due escalation jobs found.');
    return;
  }

  for (const complaintId of complaintIds) {
    try {
      const result = await processComplaintEscalation(complaintId);
      console.log(JSON.stringify(result));
    } catch (error) {
      console.error('Failed to process escalation job', complaintId, error);
    }
  }
}

async function main() {
  const once = process.argv.includes('--once');

  if (once) {
    await runOnce();
    await pool.end();
    return;
  }

  console.log('Escalation worker started. Polling Redis queue every 10 seconds.');

  const loop = async () => {
    try {
      await runOnce();
    } catch (error) {
      console.error('Escalation worker loop failed', error);
    }
  };

  await loop();
  const interval = setInterval(loop, LOOP_INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(interval);
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
