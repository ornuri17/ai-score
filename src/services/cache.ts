// ============================================================
// AIScore Cache Service
// Redis-first cache with DB fallback and circuit breaker.
// ============================================================

import Redis from 'ioredis';
import { CachedCheck } from '../types';
import { config } from '../config';
import { logger } from '../logger';

// Minimal interface for the DB dependency — avoids hard coupling to Prisma
// until the scoring workstream's src/db/client.ts is available.
export interface DbClient {
  checks: {
    findFirst: (args: {
      where: {
        domain: string;
        expiresAt: { gt: Date };
      };
      orderBy: { cachedAt: 'desc' };
    }) => Promise<CachedCheck | null>;
  };
}

export interface CacheService {
  get(domain: string): Promise<CachedCheck | null>;
  set(domain: string, value: CachedCheck): Promise<void>;
  isHealthy(): boolean;
}

interface CircuitBreakerState {
  failures: number;
  openedAt: number | null; // timestamp when circuit was opened
}

function redisKeyFor(domain: string): string {
  return `checks:${domain}`;
}

function isExpired(check: CachedCheck): boolean {
  return new Date(check.expiresAt).getTime() <= Date.now();
}

export function createCacheService(db?: DbClient): CacheService {
  const redis = new Redis(config.redis.url);

  const cb: CircuitBreakerState = {
    failures: 0,
    openedAt: null,
  };

  function isCircuitOpen(): boolean {
    if (cb.openedAt === null) return false;
    const elapsed = Date.now() - cb.openedAt;
    if (elapsed >= config.rateLimit.circuitBreakerResetMs) {
      // Auto-reset after the reset window
      cb.failures = 0;
      cb.openedAt = null;
      logger.warn('Cache circuit breaker: closed (reset after timeout)');
      return false;
    }
    return true;
  }

  function recordFailure(): void {
    cb.failures += 1;
    if (cb.failures >= config.rateLimit.circuitBreakerFailures && cb.openedAt === null) {
      cb.openedAt = Date.now();
      logger.warn('Cache circuit breaker: opened after consecutive Redis failures', {
        failures: cb.failures,
      });
    }
  }

  function recordSuccess(): void {
    if (cb.failures > 0) {
      cb.failures = 0;
      cb.openedAt = null;
      logger.warn('Cache circuit breaker: closed after successful Redis call');
    }
  }

  async function getFromDb(domain: string): Promise<CachedCheck | null> {
    if (db === undefined) return null;
    try {
      return await db.checks.findFirst({
        where: { domain, expiresAt: { gt: new Date() } },
        orderBy: { cachedAt: 'desc' },
      });
    } catch (err) {
      logger.error('Cache DB fallback error', err);
      return null;
    }
  }

  async function get(domain: string): Promise<CachedCheck | null> {
    // If circuit is open, skip Redis entirely
    if (!isCircuitOpen()) {
      try {
        const raw = await redis.get(redisKeyFor(domain));
        if (raw !== null) {
          const parsed = JSON.parse(raw) as CachedCheck;
          if (isExpired(parsed)) {
            return null;
          }
          recordSuccess();
          return parsed;
        }
        // Redis returned null (cache miss) — still counts as a success
        recordSuccess();
        // Fall through to DB
      } catch (err) {
        logger.warn('Redis get error, falling back to DB', err);
        recordFailure();
        // Fall through to DB
      }
    }

    return getFromDb(domain);
  }

  async function set(domain: string, value: CachedCheck): Promise<void> {
    if (isCircuitOpen()) {
      logger.warn('Cache circuit open — skipping Redis set', { domain });
      return;
    }
    try {
      await redis.set(
        redisKeyFor(domain),
        JSON.stringify(value),
        'EX',
        config.cache.ttlSeconds,
      );
      recordSuccess();
    } catch (err) {
      logger.warn('Redis set error — result is already persisted in DB', { domain, err });
      recordFailure();
      // Do not throw — the value is in DB
    }
  }

  function isHealthy(): boolean {
    return !isCircuitOpen();
  }

  return { get, set, isHealthy };
}
