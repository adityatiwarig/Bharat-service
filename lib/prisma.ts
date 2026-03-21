import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL is not configured.');
  }

  return databaseUrl;
}

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
  max: 10,
});

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
