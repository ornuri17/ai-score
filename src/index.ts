import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './logger';
import { createCacheService } from './services/cache';
import { createRateLimiterMiddleware, createFormRateLimiterMiddleware } from './middleware/rateLimiter';
import { createAnalyzeRouter } from './routes/analyze';
import { createLeadsRouter } from './routes/leads';

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

// Mount the leads route with its own (stricter) form rate limiter
app.post('/api/leads', formRateLimiterMiddleware, createLeadsRouter());

app.listen(config.port, (): void => {
  logger.info(`AIScore API running on port ${config.port}`);
});

export default app;
