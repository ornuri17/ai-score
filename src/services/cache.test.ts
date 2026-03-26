// ============================================================
// Unit tests for CacheService
// ============================================================

import { createCacheService, CacheService, DbClient } from './cache';
import { CachedCheck } from '../types';

// ── Mock ioredis ────────────────────────────────────────────────────────────

const mockGet = jest.fn<Promise<string | null>, [string]>();
const mockSet = jest.fn<Promise<string>, [string, string, string, number]>();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
  }));
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function futureDate(offsetMs = 7 * 24 * 60 * 60 * 1000): Date {
  return new Date(Date.now() + offsetMs);
}

function pastDate(offsetMs = 60_000): Date {
  return new Date(Date.now() - offsetMs);
}

function makeCheck(overrides: Partial<CachedCheck> = {}): CachedCheck {
  return {
    checkId: 'test-id',
    score: 75,
    dimensions: { crawlability: 20, content: 30, technical: 15, quality: 10 },
    issues: [],
    cachedAt: new Date(),
    expiresAt: futureDate(),
    domain: 'example.com',
    ...overrides,
  };
}

function makeDb(result: CachedCheck | null = null): DbClient {
  return {
    checks: {
      findFirst: jest.fn().mockResolvedValue(result),
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore env vars so circuitBreaker resets each test
    process.env['CIRCUIT_BREAKER_FAILURES'] = '3';
    process.env['CIRCUIT_BREAKER_RESET_MS'] = '300000';
  });

  describe('get()', () => {
    it('returns null when Redis returns null (cache miss)', async () => {
      mockGet.mockResolvedValue(null);
      service = createCacheService();

      const result = await service.get('example.com');

      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('checks:example.com');
    });

    it('returns null when cached check is expired', async () => {
      const expiredCheck = makeCheck({ expiresAt: pastDate() });
      mockGet.mockResolvedValue(JSON.stringify(expiredCheck));
      service = createCacheService();

      const result = await service.get('example.com');

      expect(result).toBeNull();
    });

    it('returns CachedCheck when Redis hit is valid', async () => {
      const check = makeCheck();
      mockGet.mockResolvedValue(JSON.stringify(check));
      service = createCacheService();

      const result = await service.get('example.com');

      expect(result).not.toBeNull();
      expect(result?.checkId).toBe('test-id');
      expect(result?.score).toBe(75);
    });

    it('opens circuit breaker after 3 consecutive Redis failures', async () => {
      mockGet.mockRejectedValue(new Error('Redis down'));
      service = createCacheService();

      expect(service.isHealthy()).toBe(true);

      await service.get('a.com');
      await service.get('b.com');
      await service.get('c.com');

      expect(service.isHealthy()).toBe(false);
    });

    it('falls back to DB when circuit is open', async () => {
      const dbCheck = makeCheck({ checkId: 'db-check' });
      const db = makeDb(dbCheck);
      mockGet.mockRejectedValue(new Error('Redis down'));
      service = createCacheService(db);

      // Trigger 3 failures to open the circuit
      await service.get('a.com');
      await service.get('b.com');
      await service.get('c.com');

      expect(service.isHealthy()).toBe(false);

      // Next call should skip Redis and go to DB
      mockGet.mockClear();
      const result = await service.get('example.com');

      expect(mockGet).not.toHaveBeenCalled();
      // Verify DB was called with correct domain on the last invocation
      expect(db.checks.findFirst).toHaveBeenCalled();
      const mockFn = db.checks.findFirst as jest.Mock;
      const lastCallArgs = mockFn.mock.calls[mockFn.mock.calls.length - 1] as [{ where: { domain: string } }] | undefined;
      expect(lastCallArgs?.[0].where.domain).toBe('example.com');
      expect(result?.checkId).toBe('db-check');
    });

    it('falls back to DB on Redis miss when db is provided', async () => {
      const dbCheck = makeCheck({ checkId: 'fallback-check' });
      const db = makeDb(dbCheck);
      mockGet.mockResolvedValue(null);
      service = createCacheService(db);

      const result = await service.get('example.com');

      expect(db.checks.findFirst).toHaveBeenCalled();
      expect(result?.checkId).toBe('fallback-check');
    });
  });

  describe('set()', () => {
    it('stores the value in Redis with TTL', async () => {
      mockSet.mockResolvedValue('OK');
      service = createCacheService();
      const check = makeCheck();

      await service.set('example.com', check);

      expect(mockSet).toHaveBeenCalledWith(
        'checks:example.com',
        JSON.stringify(check),
        'EX',
        expect.any(Number),
      );
    });

    it('logs a warning but does not throw when Redis fails', async () => {
      mockSet.mockRejectedValue(new Error('Redis write error'));
      service = createCacheService();
      const check = makeCheck();

      // Should not throw
      await expect(service.set('example.com', check)).resolves.toBeUndefined();
    });
  });

  describe('isHealthy()', () => {
    it('returns true initially', () => {
      service = createCacheService();
      expect(service.isHealthy()).toBe(true);
    });

    it('returns false when circuit is open', async () => {
      mockGet.mockRejectedValue(new Error('Redis down'));
      service = createCacheService();

      await service.get('a.com');
      await service.get('b.com');
      await service.get('c.com');

      expect(service.isHealthy()).toBe(false);
    });
  });
});
