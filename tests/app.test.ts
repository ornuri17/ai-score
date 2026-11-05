import request from 'supertest';
import { createApp } from '../src/index';
import { createMemoryCheckStore } from '../src/services/checkStore';
import { ScoreResult } from '../src/types';
import { memoryCache } from './helpers';

function result(domain: string, score: number, checkedAt: string): ScoreResult {
  return {
    checkId: `${domain}-${checkedAt}`,
    score,
    dimensions: { crawlability: 20, content: 30, technical: 20, quality: 10 },
    issues: [],
    summary: '',
    cached: false,
    checkedAt,
    expiresAt: checkedAt,
    url: `https://${domain}`,
    domain,
  };
}

async function seededApp() {
  const store = createMemoryCheckStore();
  const meta = { ipHash: 'x', urlHash: 'y' };
  await store.record(result('www.alpha.com', 70, '2026-01-01T00:00:00.000Z'), meta);
  await store.record(result('alpha.com', 90, '2026-02-01T00:00:00.000Z'), meta);
  await store.record(result('beta.com', 80, '2026-01-15T00:00:00.000Z'), meta);
  return createApp({ checkStore: store, cacheService: memoryCache() });
}

describe('HTTP API', () => {
  it('GET /health', async () => {
    const res = await request(createApp({ checkStore: createMemoryCheckStore(), cacheService: memoryCache() })).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns JSON 404 for unknown paths instead of 500', async () => {
    const app = createApp({ checkStore: createMemoryCheckStore(), cacheService: memoryCache() });
    for (const path of ['/api/nosuch', '/nosuch', '/.well-known/mcp.json']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('not_found');
    }
  });

  it('returns 400 (not 500) for malformed JSON', async () => {
    const app = createApp({ checkStore: createMemoryCheckStore(), cacheService: memoryCache() });
    const res = await request(app).post('/api/analyze').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  it('GET /api/stats', async () => {
    const res = await request(await seededApp()).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalChecks: 3, totalDomains: 2 });
  });

  it('GET /api/leaderboard ranks domains by best score and merges www', async () => {
    const res = await request(await seededApp()).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toEqual([
      { rank: 1, domain: 'alpha.com', score: 90, checks: 2 },
      { rank: 2, domain: 'beta.com', score: 80, checks: 1 },
    ]);
  });

  it('GET /api/badge/:domain returns an SVG with the latest score', async () => {
    const app = await seededApp();
    const res = await request(app).get('/api/badge/alpha.com').responseType('blob');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect((res.body as Buffer).toString('utf8')).toContain('90/100');
    const unknown = await request(app).get('/api/badge/never-scored.com').responseType('blob');
    expect(unknown.status).toBe(200);
    expect((unknown.body as Buffer).toString('utf8')).toContain('not scored');
    const bad = await request(app).get('/api/badge/not a domain');
    expect(bad.status).toBe(400);
  });

  it('GET /api/history/:domain returns newest first', async () => {
    const res = await request(await seededApp()).get('/api/history/alpha.com');
    expect(res.status).toBe(200);
    const body = res.body as { history: Array<{ score: number }> };
    expect(body.history.map((h) => h.score)).toEqual([90, 70]);
  });

  it('GET /share/:domain renders OG tags and redirects to the analysis page', async () => {
    const res = await request(await seededApp()).get('/share/alpha.com?score=91');
    expect(res.status).toBe(200);
    expect(res.text).toContain('alpha.com scored 91/100');
    expect(res.text).toContain('https://www.gradebyai.com/analysis/alpha.com');
  });

  it('answers 503 JSON when the store fails', async () => {
    const broken = createMemoryCheckStore();
    broken.totalChecks = () => Promise.reject(new Error('relation "Check" does not exist'));
    broken.leaderboard = () => Promise.reject(new Error('relation "Check" does not exist'));
    const app = createApp({ checkStore: broken, cacheService: memoryCache() });
    expect((await request(app).get('/api/stats')).status).toBe(503);
    expect((await request(app).get('/api/leaderboard')).status).toBe(503);
  });
});
