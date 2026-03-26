# AIScore API

Express + TypeScript API that scores website AI-friendliness (0-100).

## Prerequisites

- Node.js 20+
- Docker + Docker Compose

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/ornuri17/ai-score.git
cd ai-score

# 2. Copy environment variables
cp .env.example .env

# 3. Start Postgres and Redis
docker-compose up -d

# 4. Install dependencies
npm install

# 5. Run database migrations
npx prisma migrate dev

# 6. Start the development server
npm run dev
```

The API will be available at `http://localhost:3000`.

Verify with:
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

## Running Tests

```bash
# Run all tests
npm test

# Run scoring-specific tests only
npm run test:scoring

# Run with coverage
npm test -- --coverage
```

## Linting and Type Checking

```bash
# ESLint (bans `any`, warns on `console`, requires explicit return types)
npm run lint

# TypeScript strict mode check
npm run type-check
```

## Build for Production

```bash
npm run build
npm start
```

## Services in `src/services/`

Each service is a thin, injectable module with a single responsibility:

| Service | Responsibility |
|---|---|
| `crawler.ts` | Fetches a URL via axios, follows redirects, captures response time |
| `scorer.ts` | Runs the four scoring dimensions (crawlability, content, technical, quality) and returns a `ScoringResult` |
| `cache.ts` | Reads/writes `CachedCheck` records from Redis with a 7-day TTL |
| `rateLimit.ts` | Enforces per-IP and per-domain daily limits via Redis counters; includes circuit breaker logic |
| `db.ts` | Thin wrapper around the Prisma client; exports a singleton `prisma` instance |

## Project Structure

```
src/
  config/         Typed configuration from env vars (imported from shared contract)
  types/          Shared type contracts — do not redefine elsewhere
  services/       Business-logic services (implemented by other workstreams)
  routes/         Express route handlers (implemented by API workstream)
  logger.ts       Logging standard — import this instead of using console directly
  index.ts        App entry point
tests/            Jest test suites (*.test.ts)
.github/
  workflows/
    ci.yml        GitHub Actions: lint → type-check → test on every push/PR
docker-compose.yml  Local Postgres 16 + Redis 7
```

## Environment Variables

See `.env.example` for a full reference. Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PORT` | `3000` | HTTP port |
| `CRAWLER_TIMEOUT_MS` | `10000` | Max ms to wait for a page fetch |
| `CACHE_TTL_SECONDS` | `604800` | Score cache lifetime (7 days) |
| `RATE_LIMIT_CHECKS_IP` | `50` | Max checks per IP per day |
| `CIRCUIT_BREAKER_FAILURES` | `3` | Failures before circuit opens |

## Logging

All code must use `src/logger.ts` — do not call `console.log` directly. Debug logs are suppressed in `NODE_ENV=production`.

```typescript
import { logger } from './logger';

logger.info('Server started', { port: 3000 });
logger.warn('Rate limit approaching', { ip: '1.2.3.4', remaining: 2 });
logger.error('DB connection failed', error);
logger.debug('Cache hit', { domain: 'example.com' });
```
