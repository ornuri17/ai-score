// ============================================================
// AIScore Rate Limiter Middleware
// IP-based (50/day) and domain-based (100/day) rate limiting.
// Fails open when Redis is unavailable.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../logger';
import { sha256 } from '../utils/hasher';

const SECONDS_PER_DAY = 86400;

type RateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function extractDomain(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function replyTooManyRequests(res: Response, ipHash: string, context: string): void {
  logger.warn('Rate limit exceeded', { ipHash, context });
  res.status(429).set('Retry-After', String(SECONDS_PER_DAY)).json({
    error: 'rate_limit_exceeded',
    message: 'You have reached the daily limit. Try again tomorrow.',
  });
}

async function trackViolation(redis: Redis, ipHash: string): Promise<void> {
  const member = `${ipHash}:${Date.now()}`;
  try {
    await redis.zadd('ratelimit:violations', Date.now(), member);
  } catch (err) {
    logger.warn('Failed to record rate limit violation in sorted set', { err });
  }
}

export function createRateLimiterMiddleware(): RateLimitMiddleware {
  const redis = new Redis(config.redis.url);

  return async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ip = req.ip ?? 'unknown';
    const ipHash = sha256(ip);
    const ipKey = `ratelimit:ip:${ipHash}`;

    // ── Layer 1: IP rate limit ──────────────────────────────────────────────
    try {
      const ipCount = await redis.incr(ipKey);
      await redis.expire(ipKey, SECONDS_PER_DAY);

      if (ipCount > config.rateLimit.checksPerIpPerDay) {
        await trackViolation(redis, ipHash);
        replyTooManyRequests(res, ipHash, 'ip');
        return;
      }
    } catch (err) {
      logger.warn('Redis error in IP rate limiter — failing open', { err });
      // Fail open: continue to next layer without enforcing limit
    }

    // ── Layer 2: Domain rate limit ──────────────────────────────────────────
    const requestBody = req.body as Record<string, unknown>;
    const domain = extractDomain(requestBody['url']);

    if (domain !== null) {
      const domainKey = `ratelimit:domain:${domain}`;
      try {
        const domainCount = await redis.incr(domainKey);
        await redis.expire(domainKey, SECONDS_PER_DAY);

        if (domainCount > config.rateLimit.checksPerDomainPerDay) {
          await trackViolation(redis, ipHash);
          replyTooManyRequests(res, ipHash, `domain:${domain}`);
          return;
        }
      } catch (err) {
        logger.warn('Redis error in domain rate limiter — failing open', { domain, err });
        // Fail open: continue without enforcing domain limit
      }
    }

    next();
  };
}
