import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

for (const envFile of ['.env', '.env.local']) {
  const envPath = resolve(process.cwd(), envFile);

  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: envFile === '.env.local' });
  }
}

const cliDatabaseEnv = process.env.DIRECT_URL?.trim() ? 'DIRECT_URL' : 'DATABASE_URL';
const shadowDatabaseEnv = process.env.SHADOW_DATABASE_URL?.trim()
  ? env('SHADOW_DATABASE_URL')
  : undefined;

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // Prisma CLI should use a direct connection on Neon when available.
    url: env(cliDatabaseEnv),
    shadowDatabaseUrl: shadowDatabaseEnv,
  },
});
