// ============================================================
// AIScore /api/analyze route
// POST / — crawl + score a URL, with cache support.
// ============================================================

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { URL } from 'url';
import { CacheService } from '../services/cache';
import { crawlUrl } from '../services/crawler';
import { scoreUrl } from '../services/scorer';
import { config } from '../config';
import { logger } from '../logger';

function normalizeUrl(raw: string): string {
  const parsed = new URL(raw);
  // Strip trailing slash for consistency
  return parsed.toString().replace(/\/$/, '');
}

function urlHash(normalizedUrl: string): string {
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}

export function createAnalyzeRouter(cacheService: CacheService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { url, force_refresh } = req.body as { url?: unknown; force_refresh?: unknown };

    if (typeof url !== 'string' || url.trim() === '') {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    let normalizedUrl: string;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Protocol must be http or https');
      }
      normalizedUrl = normalizeUrl(url.trim());
    } catch {
      res.status(400).json({ error: 'Invalid URL — must be a valid http or https URL' });
      return;
    }

    const cacheKey = urlHash(normalizedUrl);
    const forceRefresh = force_refresh === true || force_refresh === 'true';

    if (!forceRefresh) {
      try {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.debug('Cache hit', { url: normalizedUrl, cacheKey });
          res.json({ ...cached, cached: true });
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('Cache get failed', { error: message });
      }
    }

    try {
      logger.info('Crawling URL', { url: normalizedUrl });
      const crawlResult = await crawlUrl(normalizedUrl, config.crawlerTimeoutMs);
      const result = scoreUrl(normalizedUrl, crawlResult);

      await cacheService.set(cacheKey, result, config.cacheTtlSeconds).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('Cache set failed', { error: message });
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Analyze failed', { url: normalizedUrl, error: message });
      res.status(500).json({ error: 'Failed to analyze URL', detail: message });
    }
  });

  return router;
}
