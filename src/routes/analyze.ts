// ============================================================
// AIScore POST /api/analyze Route
// Integrates: validator → cache → crawler → scorer → DB → cache
// ============================================================

import { Router, Request, Response } from 'express';
import { isValidUrl, extractDomain, normalizeUrl } from '../utils/validators';
import { sha256 } from '../utils/hasher';
import { fetchWebsite, fetchRobotsTxt, fetchSitemap } from '../services/crawler';
import { scoreWebsite } from '../services/scorer';
import * as checksRepository from '../db/checks.repository';
import { logger } from '../logger';
import type { CacheService } from '../services/cache';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ErrorResponse,
  CachedCheck,
} from '../types';

// ── Factory that binds the shared CacheService to the router ──────────────────

export function createAnalyzeRouter(cacheService: CacheService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Partial<AnalyzeRequest>;

    // ── 1. Validate request ────────────────────────────────────────────────────
    const url = body.url;
    if (typeof url !== 'string' || url.length === 0) {
      const errBody: ErrorResponse = {
        error: 'invalid_url',
        message: 'URL must be a valid http/https address',
      };
      res.status(400).json(errBody);
      return;
    }

    if (!isValidUrl(url)) {
      const errBody: ErrorResponse = {
        error: 'invalid_url',
        message: 'URL must be a valid http/https address',
      };
      res.status(400).json(errBody);
      return;
    }

    const forceRefresh = body.force_refresh === true;

    // ── 2. Derive domain + URL hash ────────────────────────────────────────────
    const domain = extractDomain(url);
    const urlHash = sha256(normalizeUrl(url));

    // ── 3. Cache lookup (skip when force_refresh) ──────────────────────────────
    if (!forceRefresh) {
      try {
        const cached = await cacheService.get(domain);
        if (cached !== null) {
          logger.info('Cache hit', { domain, checkId: cached.checkId });

          const cachedAtMs = new Date(cached.cachedAt).getTime();
          const diffDays = Math.round((Date.now() - cachedAtMs) / (1000 * 60 * 60 * 24));
          const ageLabel =
            diffDays === 0 ? 'today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

          const responseBody: AnalyzeResponse & { cache_hit: string } = {
            check_id: cached.checkId,
            score: cached.score,
            dimensions: cached.dimensions,
            issues: cached.issues,
            cached: true,
            checked_at: new Date(cached.cachedAt).toISOString(),
            expires_at: new Date(cached.expiresAt).toISOString(),
            cache_hit: `Previously analyzed ${ageLabel}`,
            summary: cached.summary,
          };

          res.status(200).json(responseBody);
          return;
        }
      } catch (err) {
        // Cache errors are non-fatal — continue to fetch
        logger.warn('Cache lookup failed, proceeding to fetch', { domain, err });
      }
    }

    // ── 4a. Fetch page + robots.txt + sitemap in parallel ─────────────────────
    let fetchResult: import('../types').FetchResult;
    try {
      const origin = (() => {
        try { return new URL(url).origin; } catch { return url; }
      })();

      const [pageResult, robotsTxt, sitemap] = await Promise.all([
        fetchWebsite(url),
        fetchRobotsTxt(origin),
        fetchSitemap(origin),
      ]);

      fetchResult = { ...pageResult, robotsTxt, sitemap };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message === 'TIMEOUT') {
        const errBody: ErrorResponse = {
          error: 'site_unreachable',
          message: 'The site took too long to respond',
        };
        res.status(503).json(errBody);
        return;
      }

      if (message === 'TOO_MANY_REDIRECTS') {
        const errBody: ErrorResponse = {
          error: 'site_unreachable',
          message: 'Too many redirects',
        };
        res.status(503).json(errBody);
        return;
      }

      logger.error('Crawler network error', { url, err });
      const errBody: ErrorResponse = {
        error: 'site_unreachable',
        message: 'Could not reach the site',
      };
      res.status(503).json(errBody);
      return;
    }

    // ── 4b. Score ──────────────────────────────────────────────────────────────
    const scoringResult = scoreWebsite(fetchResult, url);

    // ── 4c. Extract IP ─────────────────────────────────────────────────────────
    const rawIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const ipHash = sha256(rawIp);
    const userAgent = req.get('User-Agent');

    // ── 4d. Persist to DB ──────────────────────────────────────────────────────
    let checkRecord: Awaited<ReturnType<typeof checksRepository.create>>;
    try {
      checkRecord = await checksRepository.create({
        domain,
        urlHash,
        score: scoringResult.score,
        crawlabilityScore: scoringResult.dimensions.crawlability,
        contentScore: scoringResult.dimensions.content,
        technicalScore: scoringResult.dimensions.technical,
        qualityScore: scoringResult.dimensions.quality,
        issues: scoringResult.issues,
        checkedAt: scoringResult.checkedAt,
        expiresAt: scoringResult.expiresAt,
        ipHash,
        userAgent,
      });
    } catch (err) {
      logger.error('DB persist error', { domain, err });
      const errBody: ErrorResponse = {
        error: 'internal_error',
        message: 'An unexpected error occurred',
      };
      res.status(500).json(errBody);
      return;
    }

    // ── 4e. Write to cache ─────────────────────────────────────────────────────
    const cachedCheck: CachedCheck = {
      checkId: checkRecord.id,
      score: scoringResult.score,
      dimensions: scoringResult.dimensions,
      issues: scoringResult.issues,
      cachedAt: scoringResult.checkedAt,
      expiresAt: scoringResult.expiresAt,
      domain,
      summary: scoringResult.summary,
    };

    try {
      await cacheService.set(domain, cachedCheck);
    } catch (err) {
      // Cache write errors are non-fatal — result is already in DB
      logger.warn('Cache set failed', { domain, err });
    }

    // ── 4f. Return response ────────────────────────────────────────────────────
    const responseBody: AnalyzeResponse = {
      check_id: checkRecord.id,
      score: scoringResult.score,
      dimensions: scoringResult.dimensions,
      issues: scoringResult.issues,
      cached: false,
      checked_at: scoringResult.checkedAt.toISOString(),
      expires_at: scoringResult.expiresAt.toISOString(),
      summary: scoringResult.summary,
    };

    res.status(200).json(responseBody);
  });

  return router;
}

// Convenience export used in src/index.ts
export { createAnalyzeRouter as analyzeRouter };
