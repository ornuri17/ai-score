// ============================================================
// AIScore Cache Service
// Uses ioredis when available, falls back to in-memory Map.
// ============================================================

import { ScoreResult } from '../types';
import { logger } from '../logger';

export interface CacheService {
  get(key: string): Promise<ScoreResult | null>;
  set(key: string, value: ScoreResult, ttlSeconds: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

interface MemoryEntry {
  value: ScoreResult;
  expiresAt: number;
}

function createMemoryCache(): CacheService {
  const store = new Map<string, MemoryEntry>();

  return {
    async get(key: string): Promise<ScoreResult | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: ScoreResult, ttlSeconds: number): Promise<void> {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}

// ---------------------------------------------------------------------------
// Redis-backed cache
// ---------------------------------------------------------------------------

async function createRedisCache(redisUrl: string): Promise<CacheService> {
  // Dynamic import so that missing ioredis won't crash the module at load time
  const { default: Redis } = await import('ioredis');
  const client = new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false });

  await client.connect().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Redis connection failed, will use memory cache', { error: message });
    throw err;
  });

  logger.info('Redis cache connected', { url: redisUrl });

  return {
    async get(key: string): Promise<ScoreResult | null> {
      const raw = await client.get(key).catch(() => null);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as ScoreResult;
      } catch {
        return null;
      }
    },
    async set(key: string, value: ScoreResult, ttlSeconds: number): Promise<void> {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('Redis set failed', { key, error: message });
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCacheService(): CacheService {
  const redisUrl = process.env['REDIS_URL'];

  if (redisUrl) {
    // Attempt Redis; on failure fall back to memory cache transparently
    const memoryFallback = createMemoryCache();
    let resolvedCache: CacheService = memoryFallback;
    let ready = false;

    const initPromise = createRedisCache(redisUrl)
      .then((rc) => {
        resolvedCache = rc;
        ready = true;
      })
      .catch(() => {
        logger.warn('Falling back to in-memory cache');
        ready = true;
      });

    return {
      async get(key: string): Promise<ScoreResult | null> {
        if (!ready) await initPromise;
        return resolvedCache.get(key);
      },
      async set(key: string, value: ScoreResult, ttlSeconds: number): Promise<void> {
        if (!ready) await initPromise;
        return resolvedCache.set(key, value, ttlSeconds);
      },
    };
  }

  logger.info('No REDIS_URL set — using in-memory cache');
  return createMemoryCache();
}
