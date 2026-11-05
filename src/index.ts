import serverlessExpress from '@vendia/serverless-express';
import { existsSync, readFileSync, readdirSync } from 'fs';
import crypto from 'crypto';
import { join } from 'path';
import { Client } from 'pg';
import { config } from './config';
import { logger } from './logger';
import { createApp } from './app';

export { createApp } from './app';
export type { AppDeps } from './app';

const app = createApp();

// Local dev server, not started in Lambda or under Jest
if (process.env['AWS_LAMBDA_FUNCTION_NAME'] === undefined && process.env['JEST_WORKER_ID'] === undefined) {
  app.listen(config.port, (): void => {
    logger.info(`AIScore API running on port ${config.port}`);
  });
}

// Lambda handler — supports a special migrate event for running DB migrations from inside the VPC
const expressHandler = serverlessExpress({ app });

export const handler = async (event: Record<string, unknown>, context: unknown): Promise<unknown> => {
  if (event['action'] === 'migrate') {
    logger.info('Running database migrations via SQL...');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();

      // Ensure _prisma_migrations tracking table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          id VARCHAR(36) PRIMARY KEY,
          checksum VARCHAR(64) NOT NULL,
          finished_at TIMESTAMPTZ,
          migration_name VARCHAR(255) NOT NULL,
          logs TEXT,
          rolled_back_at TIMESTAMPTZ,
          started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          applied_steps_count INTEGER NOT NULL DEFAULT 0
        )
      `);

      const migrationsDir = join('/var/task/prisma/migrations');
      if (!existsSync(migrationsDir)) {
        throw new Error(`No migrations directory at ${migrationsDir}`);
      }
      const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(f => !f.startsWith('.') && f !== 'migration_lock.toml')
        .sort();

      const applied: string[] = [];
      const skipped: string[] = [];

      for (const folder of migrationFolders) {
        const sqlPath = join(migrationsDir, folder, 'migration.sql');
        const { rows } = await client.query(
          'SELECT id FROM "_prisma_migrations" WHERE migration_name = $1',
          [folder]
        );
        if (rows.length > 0) { skipped.push(folder); continue; }

        const sql = readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
           VALUES ($1, $2, $3, now(), 1)`,
          [crypto.randomUUID(), folder, folder]
        );
        applied.push(folder);
      }

      logger.info('Migrations complete', { applied, skipped });
      return { success: true, applied, skipped };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Migration failed', { error: message });
      return { success: false, error: message };
    } finally {
      await client.end();
    }
  }
  return expressHandler(
    event as Parameters<typeof expressHandler>[0],
    context as Parameters<typeof expressHandler>[1],
    (() => undefined) as Parameters<typeof expressHandler>[2],
  );
};

export default app;
