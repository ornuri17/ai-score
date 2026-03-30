import express from 'express';
import cors from 'cors';
import serverlessExpress from '@vendia/serverless-express';
import { config } from './config';
import { logger } from './logger';
import { createCacheService } from './services/cache';
import { createRateLimiterMiddleware, createFormRateLimiterMiddleware } from './middleware/rateLimiter';
import { createAnalyzeRouter } from './routes/analyze';
import { createLeadsRouter } from './routes/leads';
import { createHistoryRouter } from './routes/history';

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

// Mount the history route
app.use('/api/history', createHistoryRouter());

// Mount the leads route with its own (stricter) form rate limiter
app.post('/api/leads', formRateLimiterMiddleware, createLeadsRouter());

// Local dev server — not started in Lambda
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(config.port, (): void => {
    logger.info(`AIScore API running on port ${config.port}`);
  });
}

// Lambda handler
export const handler = serverlessExpress({ app });

export default app;
