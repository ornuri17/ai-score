import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import serverlessExpress from '@vendia/serverless-express';
import { existsSync, readFileSync, readdirSync } from 'fs';
import crypto from 'crypto';
import { join } from 'path';
import { Client } from 'pg';
import { config } from './config';
import { logger } from './logger';
import { CacheService, createCacheService } from './services/cache';
import { CheckStore, createCheckStore } from './services/checkStore';
import { createRateLimiterMiddleware, createFormRateLimiterMiddleware } from './middleware/rateLimiter';
import { adminAuthMiddleware } from './middleware/adminAuth';
import { createAnalyzeRouter } from './routes/analyze';
import { createCompareRouter } from './routes/compare';
import { createLeadsRouter } from './routes/leads';
import { createHistoryRouter } from './routes/history';
import { createAdminRouter } from './routes/admin';
import { createBadgeRouter, createLeaderboardRouter, createShareRouter, createStatsRouter } from './routes/public';

export interface AppDeps {
  cacheService?: CacheService;
  checkStore?: CheckStore;
}

export function createApp(deps: AppDeps = {}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Instantiate shared services once at startup, no per-request connections
  const cacheService = deps.cacheService ?? createCacheService();
  const checkStore = deps.checkStore ?? createCheckStore();
  const rateLimiterMiddleware = createRateLimiterMiddleware();
  const formRateLimiterMiddleware = createFormRateLimiterMiddleware();

  // Health check (no rate limiting)
  app.get('/health', (_req, res): void => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public, cacheable read endpoints used by the frontend (home counter,
  // leaderboard, embeddable badge, share links). Not rate limited: they do no crawling.
  app.use('/api/stats', createStatsRouter(checkStore));
  app.use('/api/leaderboard', createLeaderboardRouter(checkStore));
  app.use('/api/badge', createBadgeRouter(checkStore));
  app.use('/share', createShareRouter());

  // Apply rate limiter before the remaining API routes
  app.use('/api', rateLimiterMiddleware);

  // Mount the analyze route
  app.use('/api/analyze', createAnalyzeRouter(cacheService, checkStore));

  // Mount the compare route
  app.use('/api/compare', createCompareRouter(cacheService, checkStore));

  // Mount the history route
  app.use('/api/history', createHistoryRouter(checkStore));

  // Mount the leads route with its own (stricter) form rate limiter
  app.post('/api/leads', formRateLimiterMiddleware, createLeadsRouter());

  // Admin routes, protected by secret key, not subject to public rate limiting
  app.use('/api/admin', adminAuthMiddleware(), createAdminRouter());

  // Explicit 404. Without it, unmatched requests fall through to Express's
  // finalhandler, which crashes under @vendia/serverless-express
  // ("TypeError: ee.on is not a function") and turns every unknown path into a 500.
  app.use((req: Request, res: Response): void => {
    res.status(404).json({ error: 'not_found', path: req.path });
  });

  // Explicit error handler, for the same reason: never reach finalhandler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : String(err);
    if (status >= 500) {
      logger.error('Unhandled error', { path: req.path, error: message });
    }
    if (res.headersSent) return;
    // 4xx from body-parser (malformed JSON, payload too large) keep their status
    res.status(status).json({ error: status >= 500 ? 'internal_error' : 'bad_request' });
  });

  return app;
}

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
