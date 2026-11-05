// ============================================================
// AIScore analysis pipeline
// Shared by /api/analyze and /api/compare: cache lookup, crawl, score,
// cache store and persistence of the check.
// ============================================================

import crypto from 'crypto';
import { URL } from 'url';
import { Request } from 'express';
import { CacheService } from './cache';
import { CheckStore, CheckMeta } from './checkStore';
import { crawlUrl } from './crawler';
import { scoreUrl } from './scorer';
import { ScoreResult } from '../types';
import { config } from '../config';
import { logger } from '../logger';

// Bump when the scoring model changes so cached results from the old model are not served.
export const SCORING_VERSION = 'v2';

export function normalizeUrl(raw: string): string {
  const parsed = new URL(raw);
  // Strip trailing slash for consistency
  return parsed.toString().replace(/\/$/, '');
}

export function urlHash(normalizedUrl: string): string {
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}

export function cacheKeyFor(normalizedUrl: string): string {
  return `${SCORING_VERSION}:${urlHash(normalizedUrl)}`;
}

export function requestMeta(req: Request, normalizedUrl: string): CheckMeta {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const salt = process.env['IP_HASH_SALT'] ?? 'gradebyai';
  return {
    ipHash: crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex'),
    userAgent: req.get('user-agent') ?? null,
    urlHash: urlHash(normalizedUrl),
  };
}

export interface AnalyzeOptions {
  cacheService: CacheService;
  store: CheckStore;
  meta: CheckMeta;
  forceRefresh?: boolean;
}

export async function analyze(normalizedUrl: string, opts: AnalyzeOptions): Promise<ScoreResult> {
  const cacheKey = cacheKeyFor(normalizedUrl);

  if (opts.forceRefresh !== true) {
    try {
      const cached = await opts.cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { url: normalizedUrl, cacheKey });
        return { ...cached, cached: true };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('Cache get failed', { error: message });
    }
  }

  logger.info('Crawling URL', { url: normalizedUrl });
  const crawlResult = await crawlUrl(normalizedUrl, config.crawlerTimeoutMs);
  const result = scoreUrl(normalizedUrl, crawlResult);

  // Persist the check before answering: leads reference it by checkId, and
  // stats / leaderboard / history / badges read from it. A storage failure
  // must not fail the analysis itself.
  await opts.store.record(result, opts.meta).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Failed to record check', { url: normalizedUrl, error: message });
  });

  await opts.cacheService.set(cacheKey, result, config.cacheTtlSeconds).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache set failed', { error: message });
  });

  return result;
}
