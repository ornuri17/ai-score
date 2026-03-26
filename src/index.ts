import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './logger';
import { createCacheService } from './services/cache';
import { createRateLimiterMiddleware } from './middleware/rateLimiter';
import { createAnalyzeRouter } from './routes/analyze';

const app = express();

app.use(cors());
app.use(express.json());

// Instantiate shared services once at startup — no per-request connections
const cacheService = createCacheService();
const rateLimiterMiddleware = createRateLimiterMiddleware();

// Health check (no rate limiting)
app.get('/health', (_req, res): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiter before all API routes
app.use('/api', rateLimiterMiddleware);

// Mount the analyze route
app.use('/api/analyze', createAnalyzeRouter(cacheService));

app.listen(config.port, (): void => {
  logger.info(`AIScore API running on port ${config.port}`);
});

export default app;
