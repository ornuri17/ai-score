// ============================================================
// AIScore /api/compare route
// POST / — score two URLs in parallel and compare results.
// ============================================================

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { URL } from 'url';
import { CacheService } from '../services/cache';
import { crawlUrl } from '../services/crawler';
import { scoreUrl } from '../services/scorer';
import { CompareResult, ScoreResult } from '../types';
import { config } from '../config';
import { logger } from '../logger';

function normalizeUrl(raw: string): string {
  return new URL(raw).toString().replace(/\/$/, '');
}

function urlHash(normalizedUrl: string): string {
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}

async function getOrFetchScore(url: string, cacheService: CacheService): Promise<ScoreResult> {
  const normalizedUrl = normalizeUrl(url);
  const cacheKey = urlHash(normalizedUrl);

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit (compare)', { url: normalizedUrl });
      return { ...cached, cached: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache get failed (compare)', { error: message });
  }

  const crawlResult = await crawlUrl(normalizedUrl, config.crawlerTimeoutMs);
  const result = scoreUrl(normalizedUrl, crawlResult);

  await cacheService.set(cacheKey, result, config.cacheTtlSeconds).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache set failed (compare)', { error: message });
  });

  return result;
}

function validateUrl(raw: unknown, _field: string): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export function createCompareRouter(cacheService: CacheService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { myUrl?: unknown; competitorUrl?: unknown };

    const myUrlRaw = validateUrl(body.myUrl, 'myUrl');
    const competitorUrlRaw = validateUrl(body.competitorUrl, 'competitorUrl');

    if (myUrlRaw == null) {
      res.status(400).json({ error: 'myUrl is required and must be a valid http or https URL' });
      return;
    }
    if (competitorUrlRaw == null) {
      res.status(400).json({ error: 'competitorUrl is required and must be a valid http or https URL' });
      return;
    }

    try {
      logger.info('Comparing URLs', { myUrl: myUrlRaw, competitorUrl: competitorUrlRaw });

      const [myResult, competitorResult] = await Promise.all([
        getOrFetchScore(myUrlRaw, cacheService),
        getOrFetchScore(competitorUrlRaw, cacheService),
      ]);

      const winner: CompareResult['winner'] =
        myResult.score > competitorResult.score
          ? 'my'
          : myResult.score < competitorResult.score
          ? 'competitor'
          : 'tie';

      const delta = Math.abs(myResult.score - competitorResult.score);

      const compareResult: CompareResult = {
        myUrl: myResult,
        competitorUrl: competitorResult,
        winner,
        delta,
      };

      res.json(compareResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Compare failed', { error: message });
      res.status(500).json({ error: 'Failed to compare URLs', detail: message });
    }
  });

  return router;
}
