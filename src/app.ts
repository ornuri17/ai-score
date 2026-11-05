// ============================================================
// AIScore Express app
// createApp() has no side effects (no listen, no Lambda wiring), so tests can
// build an app with in-memory dependencies without opening Redis or DB handles.
// ============================================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
import { createMcpRouter } from './routes/mcp';
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

  // MCP server for AI agents (scan_site tool), same rate limit as the API
  app.use('/mcp', rateLimiterMiddleware, createMcpRouter(cacheService, checkStore));

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
