import 'server-only';

import * as net from 'node:net';
import * as tls from 'node:tls';

const REDIS_REST_URL = process.env.REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_REST_TOKEN = process.env.REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_REQUEST_TIMEOUT_MS = 800;
const REDIS_RETRY_BACKOFF_MS = 5000;

export type RedisCommandArgument = string | number;
type RedisResponse<T> = {
  result?: T;
  error?: string;
};

type RedisMode = 'disabled' | 'rest' | 'tcp' | 'memory';
type RedisStatus = {
  configured: boolean;
  available: boolean;
  mode: RedisMode;
  reason: string;
};

type ParsedRedisUrl = {
  host: string;
  port: number;
  password?: string;
  database?: number;
  tls: boolean;
};

let redisBackoffUntil = 0;
let redisStatusCache: { expiresAt: number; value: RedisStatus } | null = null;
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function getRedisMode(): RedisMode {
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

  try {
    const parsed = new URL(REDIS_URL);
    const isTls = parsed.protocol === 'rediss:';

    if (parsed.protocol !== 'redis:' && !isTls) {
      return null;
    }

    return {
      host: parsed.hostname,
      port: Number(parsed.port || (isTls ? 6380 : 6379)),
      password: parsed.password || undefined,
      database: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined,
      tls: isTls,
    } satisfies ParsedRedisUrl;
  } catch {
    return null;
  }
}

function shouldBypassRedis() {
  return Date.now() < redisBackoffUntil;
}

function getMemoryCacheValue(key: string) {
  const entry = memoryCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

function setMemoryCacheValue(key: string, value: string, ttlSeconds: number) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function deleteMemoryCacheKeys(keys: string[]) {
  keys.forEach((key) => {
    memoryCache.delete(key);
  });
}

function markRedisFailure() {
  redisBackoffUntil = Date.now() + REDIS_RETRY_BACKOFF_MS;
  redisStatusCache = {
    expiresAt: Date.now() + REDIS_RETRY_BACKOFF_MS,
    value: {
      configured: getRedisMode() !== 'disabled',
      available: false,
      mode: getRedisMode(),
      reason: 'Redis connection failed',
    },
  };
}

function markRedisSuccess() {
  redisBackoffUntil = 0;
  redisStatusCache = {
    expiresAt: Date.now() + REDIS_RETRY_BACKOFF_MS,
    value: {
      configured: true,
      available: true,
      mode: getRedisMode(),
      reason: 'Redis connection healthy',
    },
  };
}

function serializeRedisCommand(command: RedisCommandArgument[]) {
  const parts = [`*${command.length}\r\n`];

  command.forEach((arg) => {
    const value = String(arg);
    parts.push(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
  });

  return Buffer.from(parts.join(''), 'utf8');
}

function parseRedisReply(buffer: Buffer, offset = 0): { value: unknown; nextOffset: number } | null {
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
    const items: unknown[] = [];

    for (let index = 0; index < count; index += 1) {
      const parsed = parseRedisReply(buffer, nextOffset);

      if (!parsed) {
        return null;
      }

      items.push(parsed.value);
      nextOffset = parsed.nextOffset;
    }

    return { value: items, nextOffset };
  }

  throw new Error('Unsupported Redis response');
}

async function executeRedisRestCommand<T>(command: RedisCommandArgument[]) {
  const response = await fetch(REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(REDIS_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Redis REST command failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RedisResponse<T>;

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}

async function executeRedisTcpCommand<T>(command: RedisCommandArgument[]) {
  const parsedUrl = parseRedisUrl();

  if (!parsedUrl) {
    throw new Error('Invalid REDIS_URL');
  }

  return new Promise<T | null>((resolve, reject) => {
    const socket = parsedUrl.tls
      ? tls.connect({
          host: parsedUrl.host,
          port: parsedUrl.port,
          servername: parsedUrl.host,
        })
      : net.createConnection({
          host: parsedUrl.host,
          port: parsedUrl.port,
        });

    const chunks: Buffer[] = [];
    const commands: Buffer[] = [];

    if (parsedUrl.password) {
      commands.push(serializeRedisCommand(['AUTH', parsedUrl.password]));
    }

    if (parsedUrl.database !== undefined && Number.isFinite(parsedUrl.database)) {
      commands.push(serializeRedisCommand(['SELECT', parsedUrl.database]));
    }

    commands.push(serializeRedisCommand(command));

    const expectedReplies = commands.length;
    let settled = false;

    const finalize = (error?: Error, value?: T | null) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();

      if (error) {
        reject(error);
        return;
      }

      resolve(value ?? null);
    };

    socket.setTimeout(REDIS_REQUEST_TIMEOUT_MS, () => {
      finalize(new Error('Redis TCP command timed out'));
    });

    socket.on('connect', () => {
      socket.write(Buffer.concat(commands));
    });

    socket.on('data', (chunk) => {
      chunks.push(chunk);

      try {
        const combined = Buffer.concat(chunks);
        const replies: unknown[] = [];
        let offset = 0;

        while (offset < combined.length && replies.length < expectedReplies) {
          const parsed = parseRedisReply(combined, offset);

          if (!parsed) {
            return;
          }

          replies.push(parsed.value);
          offset = parsed.nextOffset;
        }

        if (replies.length < expectedReplies) {
          return;
        }

        finalize(undefined, (replies[replies.length - 1] as T | null) ?? null);
      } catch (error) {
        finalize(error instanceof Error ? error : new Error('Redis TCP command failed'));
      }
    });

    socket.on('error', (error) => {
      finalize(error);
    });
  });
}

async function executeRedisCommand<T>(command: RedisCommandArgument[]) {
  const mode = getRedisMode();

  if (mode === 'disabled' || shouldBypassRedis()) {
    return null;
  }

  try {
    const result = mode === 'rest'
      ? await executeRedisRestCommand<T>(command)
      : await executeRedisTcpCommand<T>(command);

    markRedisSuccess();
    return result;
  } catch (error) {
    console.warn('Redis command failed', command[0], error);
    markRedisFailure();
    return null;
  }
}

export async function runRedisCommand<T>(command: RedisCommandArgument[]) {
  return executeRedisCommand<T>(command);
}

export async function getRedisJson<T>(key: string) {
  const memoryPayload = getMemoryCacheValue(key);

  if (memoryPayload) {
    try {
      return JSON.parse(memoryPayload) as T;
    } catch (error) {
      console.warn('Memory cache payload parse failed for key', key, error);
      memoryCache.delete(key);
    }
  }

  const payload = await executeRedisCommand<string | null>(['GET', key]);

  if (!payload) {
    return null;
  }

  try {
    setMemoryCacheValue(key, payload, 30);
    return JSON.parse(payload) as T;
  } catch (error) {
    console.warn('Redis payload parse failed for key', key, error);
    return null;
  }
}

export async function setRedisJson(key: string, value: unknown, ttlSeconds: number) {
  const payload = JSON.stringify(value);
  setMemoryCacheValue(key, payload, ttlSeconds);
  await executeRedisCommand(['SETEX', key, ttlSeconds, payload]);
}

export async function deleteRedisKeys(keys: string[]) {
  if (!keys.length) {
    return;
  }

  deleteMemoryCacheKeys(keys);
  await executeRedisCommand(['DEL', ...keys]);
}

export function isRedisCacheConfigured() {
  return true;
}

export async function getRedisStatus(): Promise<RedisStatus> {
  if (shouldBypassRedis() && redisStatusCache) {
    return redisStatusCache.value;
  }

  if (redisStatusCache && redisStatusCache.expiresAt > Date.now()) {
    return redisStatusCache.value;
  }

  const mode = getRedisMode();

  if (mode === 'disabled') {
    const status = {
      configured: false,
      available: true,
      mode: 'memory',
      reason: 'External Redis not configured. Using in-memory cache fallback.',
    } satisfies RedisStatus;
    redisStatusCache = { expiresAt: Date.now() + REDIS_RETRY_BACKOFF_MS, value: status };
    return status;
  }

  const ping = await executeRedisCommand<string | null>(['PING']);

  if (ping === 'PONG') {
    return {
      configured: true,
      available: true,
      mode,
      reason: 'Redis is responding normally',
    };
  }

  return {
    configured: true,
    available: false,
    mode,
    reason: 'Redis is configured but not reachable. Using in-memory cache fallback.',
  };
}
