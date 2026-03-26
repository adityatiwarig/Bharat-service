import 'server-only';

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/prisma';

export interface QueryResultRow {
  [column: string]: unknown;
}

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
}

type PrismaLikeClient = Pick<
  typeof db,
  '$queryRawUnsafe' | '$executeRawUnsafe'
> | Pick<Prisma.TransactionClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

export interface DbTransactionClient {
  query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

type TransactionOptions = {
  timeout_ms?: number;
  max_wait_ms?: number;
};

const READ_QUERY_RETRY_DELAYS_MS = [250, 750] as const;

function isReturningQuery(text: string) {
  const normalized = text.trim().toLowerCase();

  return (
    normalized.startsWith('select') ||
    normalized.startsWith('with') ||
    /\breturning\b/.test(normalized)
  );
}

function isReadOnlyQuery(text: string) {
  const normalized = text.trim().toLowerCase();

  if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
    return false;
  }

  return !/\b(insert|update|delete|merge|upsert|create|alter|drop|truncate)\b/.test(normalized);
}

function isTransientDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const prismaError = error as Error & {
    code?: string;
    meta?: {
      driverAdapterError?: {
        cause?: {
          code?: string;
        };
      };
    };
  };

  const haystack = `${prismaError.name} ${prismaError.message}`.toLowerCase();
  const driverCauseCode = prismaError.meta?.driverAdapterError?.cause?.code;

  return (
    prismaError.code === 'ETIMEDOUT' ||
    prismaError.code === 'P2010' ||
    driverCauseCode === 'ETIMEDOUT' ||
    haystack.includes('database server') ||
    haystack.includes("can't reach database server") ||
    haystack.includes('databasenotreachable') ||
    haystack.includes('timed out') ||
    haystack.includes('timeout') ||
    haystack.includes('econnreset') ||
    haystack.includes('connection terminated')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runQuery<T extends QueryResultRow>(
  client: PrismaLikeClient,
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (isReturningQuery(text)) {
    const allowRetry = isReadOnlyQuery(text);

    for (let attempt = 0; ; attempt += 1) {
      try {
        const rows = await client.$queryRawUnsafe<T[]>(text, ...params);
        return { rows };
      } catch (error) {
        const retryDelay = READ_QUERY_RETRY_DELAYS_MS[attempt];

        if (!allowRetry || retryDelay === undefined || !isTransientDatabaseError(error)) {
          throw error;
        }

        await sleep(retryDelay);
      }
    }
  }

  await client.$executeRawUnsafe(text, ...params);
  return { rows: [] };
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return runQuery<T>(db, text, params);
}

export async function withTransaction<T>(
  callback: (client: DbTransactionClient) => Promise<T>,
  options: TransactionOptions = {},
) {
  return db.$transaction(async (tx) =>
    callback({
      query: <R extends QueryResultRow>(text: string, params: unknown[] = []) =>
        runQuery<R>(tx, text, params),
    }),
    {
      timeout: options.timeout_ms ?? 20000,
      maxWait: options.max_wait_ms ?? 10000,
    },
  );
}
