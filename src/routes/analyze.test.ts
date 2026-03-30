// ============================================================
// Integration-style tests for POST /api/analyze
// All external services are mocked — no real network or DB.
// ============================================================

import express from 'express';
import request from 'supertest';
import { createAnalyzeRouter } from './analyze';
import type { CacheService } from '../services/cache';
import type { CachedCheck, ScoringResult, FetchResult } from '../types';
import type { Check } from '@prisma/client';

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../services/crawler');
jest.mock('../services/scorer');
jest.mock('../db/checks.repository');

import { fetchWebsite, fetchRobotsTxt, fetchSitemap } from '../services/crawler';
import { scoreWebsite } from '../services/scorer';
import * as checksRepo from '../db/checks.repository';

const mockFetchWebsite = fetchWebsite as jest.MockedFunction<typeof fetchWebsite>;
const mockFetchRobotsTxt = fetchRobotsTxt as jest.MockedFunction<typeof fetchRobotsTxt>;
const mockFetchSitemap = fetchSitemap as jest.MockedFunction<typeof fetchSitemap>;
const mockScoreWebsite = scoreWebsite as jest.MockedFunction<typeof scoreWebsite>;
const mockChecksCreate = checksRepo.create as jest.MockedFunction<typeof checksRepo.create>;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');
const EXPIRES_DATE = new Date('2026-01-08T00:00:00.000Z');

// What fetchWebsite returns (page fields only — robots/sitemap added by route)
const MOCK_PAGE_RESULT = {
  html: '<html><body>Hello world</body></html>',
  statusCode: 200,
  redirectCount: 0,
  responseTimeMs: 400,
  finalUrl: 'https://example.com',
};

// Full assembled FetchResult (page + robots + sitemap)
const MOCK_FETCH_RESULT: FetchResult = {
  ...MOCK_PAGE_RESULT,
  robotsTxt: {
    exists: false,
    blocksAllCrawlers: false,
    blocksAiCrawlers: false,
    sitemapUrls: [],
  },
  sitemap: {
    exists: false,
    urlCount: 0,
  },
};

const MOCK_SCORING_RESULT: ScoringResult = {
  score: 72,
  dimensions: {
    crawlability: 20,
    content: 28,
    technical: 15,
    quality: 9,
  },
  issues: ['structured_data_missing'],
  checkedAt: FIXED_DATE,
  expiresAt: EXPIRES_DATE,
  summary: '',
};

const MOCK_CHECK_RECORD: Check = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  domain: 'example.com',
  urlHash: 'somehash',
  score: 72,
  crawlabilityScore: 20,
  contentScore: 28,
  technicalScore: 15,
  qualityScore: 9,
  issues: ['structured_data_missing'],
  checkedAt: FIXED_DATE,
  expiresAt: EXPIRES_DATE,
  ipHash: 'iphash',
  userAgent: null,
  languageDetected: null,
  referrerSource: null,
  createdAt: FIXED_DATE,
};

const MOCK_CACHED_CHECK: CachedCheck = {
  checkId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  score: 72,
  dimensions: {
    crawlability: 20,
    content: 28,
    technical: 15,
    quality: 9,
  },
  issues: ['structured_data_missing'],
  cachedAt: FIXED_DATE,
  expiresAt: EXPIRES_DATE,
  domain: 'example.com',
};

// ── Test helpers ─────────────────────────────────────────────────────────────

function buildApp(cacheService: CacheService): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/analyze', createAnalyzeRouter(cacheService));
  return app;
}

function makeCacheService(overrides?: Partial<CacheService>): CacheService {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockReturnValue(true),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks for robots.txt and sitemap — return empty/not-found by default
    mockFetchRobotsTxt.mockResolvedValue({
      exists: false,
      blocksAllCrawlers: false,
      blocksAiCrawlers: false,
      sitemapUrls: [],
    });
    mockFetchSitemap.mockResolvedValue({ exists: false, urlCount: 0 });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns 200 with correct response shape for a valid URL', async () => {
    mockFetchWebsite.mockResolvedValueOnce(MOCK_PAGE_RESULT);
    mockScoreWebsite.mockReturnValueOnce(MOCK_SCORING_RESULT);
    mockChecksCreate.mockResolvedValueOnce(MOCK_CHECK_RECORD);

    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      check_id: MOCK_CHECK_RECORD.id,
      score: 72,
      dimensions: MOCK_SCORING_RESULT.dimensions,
      issues: ['structured_data_missing'],
      cached: false,
      checked_at: FIXED_DATE.toISOString(),
      expires_at: EXPIRES_DATE.toISOString(),
    });

    expect(mockFetchWebsite).toHaveBeenCalledWith('https://example.com');
    expect(mockScoreWebsite).toHaveBeenCalledWith(
      expect.objectContaining(MOCK_FETCH_RESULT),
      'https://example.com',
    );
    expect(mockChecksCreate).toHaveBeenCalledTimes(1);
    expect(cacheService.set).toHaveBeenCalledTimes(1);
  });

  // ── Cache hit ───────────────────────────────────────────────────────────────

  it('returns 200 with cached: true on cache hit', async () => {
    const cacheService = makeCacheService({
      get: jest.fn().mockResolvedValue(MOCK_CACHED_CHECK),
    });
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.check_id).toBe(MOCK_CACHED_CHECK.checkId);
    expect(typeof res.body.cache_hit).toBe('string');
    expect(res.body.cache_hit.length).toBeGreaterThan(0);

    // Should NOT have called fetch/score/persist
    expect(mockFetchWebsite).not.toHaveBeenCalled();
    expect(mockScoreWebsite).not.toHaveBeenCalled();
    expect(mockChecksCreate).not.toHaveBeenCalled();
  });

  // ── force_refresh bypasses cache ────────────────────────────────────────────

  it('bypasses cache and re-fetches when force_refresh is true', async () => {
    mockFetchWebsite.mockResolvedValueOnce(MOCK_PAGE_RESULT);
    mockScoreWebsite.mockReturnValueOnce(MOCK_SCORING_RESULT);
    mockChecksCreate.mockResolvedValueOnce(MOCK_CHECK_RECORD);

    // cache.get returns data, but should be skipped
    const cacheService = makeCacheService({
      get: jest.fn().mockResolvedValue(MOCK_CACHED_CHECK),
    });
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://example.com', force_refresh: true });

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(false);
    // cache.get should NOT have been called
    expect(cacheService.get).not.toHaveBeenCalled();
    // But result is still written back to cache
    expect(cacheService.set).toHaveBeenCalledTimes(1);
    expect(mockFetchWebsite).toHaveBeenCalledTimes(1);
  });

  // ── Validation errors ────────────────────────────────────────────────────────

  it('returns 400 when url is missing', async () => {
    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'invalid_url',
      message: 'URL must be a valid http/https address',
    });
    expect(mockFetchWebsite).not.toHaveBeenCalled();
  });

  it('returns 400 for localhost URL (SSRF protection)', async () => {
    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'http://localhost:3000/secret' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_url');
    expect(mockFetchWebsite).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-URL string', async () => {
    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'not-a-url-at-all' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_url');
  });

  // ── Crawler errors ───────────────────────────────────────────────────────────

  it('returns 503 when crawler throws TIMEOUT', async () => {
    mockFetchWebsite.mockRejectedValueOnce(new Error('TIMEOUT'));

    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://slow-site.example.com' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: 'site_unreachable',
      message: 'The site took too long to respond',
    });
  });

  it('returns 503 when crawler throws TOO_MANY_REDIRECTS', async () => {
    mockFetchWebsite.mockRejectedValueOnce(new Error('TOO_MANY_REDIRECTS'));

    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://redirect-loop.example.com' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: 'site_unreachable',
      message: 'Too many redirects',
    });
  });

  it('returns 503 for generic network errors from the crawler', async () => {
    mockFetchWebsite.mockRejectedValueOnce(new Error('Network error fetching https://down.example.com: ECONNREFUSED'));

    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://down.example.com' });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: 'site_unreachable',
      message: 'Could not reach the site',
    });
  });

  // ── DB errors ────────────────────────────────────────────────────────────────

  it('returns 500 when the DB throws during persist', async () => {
    mockFetchWebsite.mockResolvedValueOnce(MOCK_PAGE_RESULT);
    mockScoreWebsite.mockReturnValueOnce(MOCK_SCORING_RESULT);
    mockChecksCreate.mockRejectedValueOnce(new Error('connection refused'));

    const cacheService = makeCacheService();
    const app = buildApp(cacheService);

    const res = await request(app)
      .post('/api/analyze')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: 'internal_error',
      message: 'An unexpected error occurred',
    });
    // Cache.set should NOT have been called since persist failed
    expect(cacheService.set).not.toHaveBeenCalled();
  });
});
