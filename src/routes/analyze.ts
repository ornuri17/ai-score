// ============================================================
// AIScore /api/analyze route
// POST /: crawl + score a URL, with cache support.
// ============================================================

import { Router, Request, Response } from 'express';
import { CacheService } from '../services/cache';
import { CheckStore } from '../services/checkStore';
import { analyze, normalizeUrl, requestMeta } from '../services/analysis';
import { logger } from '../logger';

export function createAnalyzeRouter(cacheService: CacheService, store: CheckStore): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { url, force_refresh } = (req.body ?? {}) as { url?: unknown; force_refresh?: unknown };

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
      res.status(400).json({ error: 'Invalid URL, must be a valid http or https URL' });
      return;
    }

    const forceRefresh = force_refresh === true || force_refresh === 'true';

    try {
      const result = await analyze(normalizedUrl, {
        cacheService,
        store,
        meta: requestMeta(req, normalizedUrl),
        forceRefresh,
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
