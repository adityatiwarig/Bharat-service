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

function isReturningQuery(text: string) {
  const normalized = text.trim().toLowerCase();

  return (
    normalized.startsWith('select') ||
    normalized.startsWith('with') ||
    /\breturning\b/.test(normalized)
  );
}

async function runQuery<T extends QueryResultRow>(
  client: PrismaLikeClient,
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  if (isReturningQuery(text)) {
    const rows = await client.$queryRawUnsafe<T[]>(text, ...params);
    return { rows };
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
