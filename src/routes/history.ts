// ============================================================
// AIScore GET /api/history/:domain Route
// Returns historical score checks for a domain (up to 30)
// ============================================================

import { Router, Request, Response } from 'express';
import { extractDomain } from '../utils/validators';
import * as checksRepository from '../db/checks.repository';
import { logger } from '../logger';
import type { HistoryResponse, ErrorResponse } from '../types';

export function createHistoryRouter(): Router {
  const router = Router();

  router.get('/:domain', async (req: Request, res: Response): Promise<void> => {
    const rawDomain = req.params.domain as string;

    if (rawDomain.trim().length === 0) {
      const errBody: ErrorResponse = { error: 'invalid_domain', message: 'Domain is required' };
      res.status(400).json(errBody);
      return;
    }

    // Normalise: strip protocol if user passes a full URL
    let domain: string;
    try {
      domain = rawDomain.includes('.')
        ? extractDomain(
            rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`,
          )
        : rawDomain.toLowerCase();
    } catch {
      const errBody: ErrorResponse = { error: 'invalid_domain', message: 'Invalid domain' };
      res.status(400).json(errBody);
      return;
    }

    try {
      const checks = await checksRepository.findHistory(domain);

      const responseBody: HistoryResponse = {
        domain,
        history: checks.map((c) => ({
          check_id: c.id,
          score: c.score,
          dimensions: {
            crawlability: c.crawlabilityScore,
            content: c.contentScore,
            technical: c.technicalScore,
            quality: c.qualityScore,
          },
          checked_at: c.checkedAt.toISOString(),
        })),
      };

      res.status(200).json(responseBody);
    } catch (err) {
      logger.error('History lookup failed', { domain, err });
      const errBody: ErrorResponse = { error: 'internal_error', message: 'An unexpected error occurred' };
      res.status(500).json(errBody);
    }
  });

  return router;
}
