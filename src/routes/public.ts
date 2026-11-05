// ============================================================
// AIScore public read routes
// GET /api/stats, GET /api/leaderboard, GET /api/badge/:domain, GET /share/:domain
// ============================================================

import { Router, Request, Response } from 'express';
import { CheckStore, normalizeDomain } from '../services/checkStore';
import { renderBadge } from '../services/badge';
import { logger } from '../logger';

const LEADERBOARD_SIZE = 50;
// Plain hostnames only: letters, digits, dots, hyphens (punycode allowed)
const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i;

export function frontendUrl(): string {
  return (process.env['FRONTEND_URL'] ?? 'https://www.gradebyai.com').replace(/\/$/, '');
}

function unavailable(res: Response, what: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`${what} failed`, { error: message });
  res.status(503).json({ error: `${what}_unavailable` });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createStatsRouter(store: CheckStore): Router {
  const router = Router();
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      const [totalChecks, totalDomains] = await Promise.all([store.totalChecks(), store.totalDomains()]);
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ totalChecks, totalDomains });
    } catch (err) {
      unavailable(res, 'stats', err);
    }
  });
  return router;
}

export function createLeaderboardRouter(store: CheckStore): Router {
  const router = Router();
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      const leaderboard = await store.leaderboard(LEADERBOARD_SIZE);
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ leaderboard });
    } catch (err) {
      unavailable(res, 'leaderboard', err);
    }
  });
  return router;
}

export function createBadgeRouter(store: CheckStore): Router {
  const router = Router();
  router.get('/:domain', async (req: Request, res: Response): Promise<void> => {
    const raw = String(req.params['domain'] ?? '').replace(/\.svg$/i, '');
    const domain = normalizeDomain(raw);
    if (!DOMAIN_PATTERN.test(domain)) {
      res.status(400).json({ error: 'invalid_domain' });
      return;
    }
    let score: number | null = null;
    try {
      score = await store.latestScore(domain);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('badge lookup failed', { domain, error: message });
      // Still answer with an image so embedded badges never show as broken
      res.set('Cache-Control', 'no-cache');
      res.type('image/svg+xml').send(renderBadge(null));
      return;
    }
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('image/svg+xml').send(renderBadge(score));
  });
  return router;
}

/**
 * Social share landing page: Open Graph tags for the score, then a redirect to the
 * analysis page on the frontend. Crawlers read the tags, people get redirected.
 */
export function createShareRouter(): Router {
  const router = Router();
  router.get('/:domain', (req: Request, res: Response): void => {
    const domain = normalizeDomain(String(req.params['domain'] ?? ''));
    if (!DOMAIN_PATTERN.test(domain)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const parsed = parseInt(String(req.query['score'] ?? ''), 10);
    const score = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
    const target = `${frontendUrl()}/analysis/${encodeURIComponent(domain)}`;
    const title = score === null ? `${domain} on GradeByAI` : `${domain} scored ${score}/100 for AI readiness`;
    const description = 'How ready is your website for ChatGPT, Claude, Perplexity and AI agents? Get a free score on GradeByAI.';
    const t = escapeHtml(title);
    const d = escapeHtml(description);
    const u = escapeHtml(target);
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<meta property="og:type" content="website">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${escapeHtml(frontendUrl())}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${u}">
<meta http-equiv="refresh" content="0; url=${u}">
</head><body><p><a href="${u}">${t}</a></p></body></html>`);
  });
  return router;
}
