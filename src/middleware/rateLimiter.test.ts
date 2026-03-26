// ============================================================
// Unit tests for rateLimiter middleware
// ============================================================

import { createRateLimiterMiddleware } from './rateLimiter';
import { Request, Response, NextFunction } from 'express';

// ── Mock ioredis ─────────────────────────────────────────────────────────────

const mockIncr = jest.fn<Promise<number>, [string]>();
const mockExpire = jest.fn<Promise<number>, [string, number]>();
const mockZadd = jest.fn<Promise<number>, [string, number, string]>();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
    zadd: mockZadd,
  }));
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    ip: '127.0.0.1',
    body: {},
    ...overrides,
  } as Request;
}

interface MockResponse {
  res: Response;
  statusCode: { value: number | null };
  jsonBody: { value: unknown };
  retryAfter: { value: string | null };
}

function buildResponse(): MockResponse {
  const statusCode = { value: null as number | null };
  const jsonBody = { value: null as unknown };
  const retryAfter = { value: null as string | null };

  const json = jest.fn((body: unknown): Response => {
    jsonBody.value = body;
    return {} as Response;
  });
  const set = jest.fn((header: string, value: string): Response => {
    if (header === 'Retry-After') retryAfter.value = value;
    return mockRes;
  });
  const status = jest.fn((code: number): Response => {
    statusCode.value = code;
    return mockRes;
  });

  const mockRes = { status, set, json } as unknown as Response;
  return { res: mockRes, statusCode, jsonBody, retryAfter };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rateLimiter middleware', () => {
  let next: jest.Mock<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn<void, []>();
    // Default: expire and zadd always succeed
    mockExpire.mockResolvedValue(1);
    mockZadd.mockResolvedValue(1);
  });

  describe('IP rate limiting', () => {
    it('calls next() when IP count is under the limit', async () => {
      mockIncr.mockResolvedValue(1); // first request of the day
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest();
      const { res, statusCode } = buildResponse();

      await middleware(req, res, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(statusCode.value).toBeNull();
    });

    it('returns 429 when IP limit is exceeded', async () => {
      mockIncr.mockResolvedValue(51); // over the 50/day limit
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest();
      const { res, statusCode, retryAfter } = buildResponse();

      await middleware(req, res, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(statusCode.value).toBe(429);
      expect(retryAfter.value).toBe('86400');
    });
  });

  describe('Domain rate limiting', () => {
    it('returns 429 when domain limit is exceeded', async () => {
      // IP is fine (1), domain is over (101)
      mockIncr
        .mockResolvedValueOnce(1)    // IP incr
        .mockResolvedValueOnce(101); // domain incr
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest({ body: { url: 'https://example.com/page' } });
      const { res, statusCode, retryAfter } = buildResponse();

      await middleware(req, res, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(statusCode.value).toBe(429);
      expect(retryAfter.value).toBe('86400');
    });

    it('calls next() when both IP and domain counts are under limits', async () => {
      mockIncr
        .mockResolvedValueOnce(5)   // IP
        .mockResolvedValueOnce(50); // domain
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest({ body: { url: 'https://example.com/page' } });
      const { res, statusCode } = buildResponse();

      await middleware(req, res, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(statusCode.value).toBeNull();
    });

    it('skips domain check when url is absent in body', async () => {
      mockIncr.mockResolvedValueOnce(1);
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest({ body: {} });
      const { res } = buildResponse();

      await middleware(req, res, next as NextFunction);

      // incr called only once (for IP), not twice
      expect(mockIncr).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Redis failure (fail-open)', () => {
    it('calls next() when Redis is completely down', async () => {
      mockIncr.mockRejectedValue(new Error('ECONNREFUSED'));
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest({ body: { url: 'https://example.com' } });
      const { res, statusCode } = buildResponse();

      await middleware(req, res, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(statusCode.value).toBeNull();
    });

    it('still enforces domain limit even when IP Redis call fails', async () => {
      mockIncr
        .mockRejectedValueOnce(new Error('IP Redis error'))  // IP fails → fail open
        .mockResolvedValueOnce(101);                          // domain succeeds → blocked
      const middleware = createRateLimiterMiddleware();
      const req = buildRequest({ body: { url: 'https://example.com' } });
      const { res, statusCode } = buildResponse();

      await middleware(req, res, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
      expect(statusCode.value).toBe(429);
    });
  });
});
