// ============================================================
// AIScore Rate Limiter Middleware
// IP-based rate limiting: 50 checks/day for API, 3/day for forms.
// ============================================================

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../logger';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function createLimiter(maxPerDay: number, label: string): RequestHandler {
  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();
    const existing = store.get(ip);

    if (!existing || now - existing.windowStart > DAY_MS) {
      // New window
      store.set(ip, { count: 1, windowStart: now });
      next();
      return;
    }

    if (existing.count >= maxPerDay) {
      logger.warn(`Rate limit exceeded [${label}]`, { ip, count: existing.count });
      res.status(429).json({ error: 'rate_limit_exceeded' });
      return;
    }

    existing.count++;
    next();
  };
}

export function createRateLimiterMiddleware(): RequestHandler {
  const limit = parseInt(process.env['RATE_LIMIT_CHECKS_IP'] ?? '50', 10);
  return createLimiter(limit, 'api');
}

export function createFormRateLimiterMiddleware(): RequestHandler {
  const limit = parseInt(process.env['RATE_LIMIT_FORMS_IP'] ?? '3', 10);
  return createLimiter(limit, 'form');
}
