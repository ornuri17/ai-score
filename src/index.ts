import express from 'express';
import cors from 'cors';
import serverlessExpress from '@vendia/serverless-express';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { config } from './config';
import { logger } from './logger';
import { createCacheService } from './services/cache';
import { createRateLimiterMiddleware, createFormRateLimiterMiddleware } from './middleware/rateLimiter';
import { adminAuthMiddleware } from './middleware/adminAuth';
import { createAnalyzeRouter } from './routes/analyze';
import { createCompareRouter } from './routes/compare';
import { createLeadsRouter } from './routes/leads';
import { createHistoryRouter } from './routes/history';
import { createAdminRouter } from './routes/admin';

const app = express();

app.use(cors());
app.use(express.json());

// Instantiate shared services once at startup — no per-request connections
const cacheService = createCacheService();
const rateLimiterMiddleware = createRateLimiterMiddleware();
const formRateLimiterMiddleware = createFormRateLimiterMiddleware();

// Health check (no rate limiting)
app.get('/health', (_req, res): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiter before all API routes
app.use('/api', rateLimiterMiddleware);

// Mount the analyze route
app.use('/api/analyze', createAnalyzeRouter(cacheService));

// Mount the compare route
app.use('/api/compare', createCompareRouter(cacheService));

// Mount the history route
app.use('/api/history', createHistoryRouter());

// Mount the leads route with its own (stricter) form rate limiter
app.post('/api/leads', formRateLimiterMiddleware, createLeadsRouter());

// Admin routes — protected by secret key, not subject to public rate limiting
app.use('/api/admin', adminAuthMiddleware(), createAdminRouter());

// Local dev server — not started in Lambda
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
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
      const migrationFolders = readdirSync(migrationsDir)
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
