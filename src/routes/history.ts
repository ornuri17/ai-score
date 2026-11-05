// ============================================================
// AIScore /api/history route
// GET /:domain: score history for a domain, newest first.
// ============================================================

import { Router, Request, Response } from 'express';
import { CheckStore, normalizeDomain } from '../services/checkStore';
import { logger } from '../logger';

const HISTORY_LIMIT = 30;

export function createHistoryRouter(store: CheckStore): Router {
  const router = Router();

  router.get('/:domain', async (req: Request, res: Response): Promise<void> => {
    const domain = normalizeDomain(String(req.params['domain'] ?? ''));
    try {
      const history = await store.history(domain, HISTORY_LIMIT);
      res.json({ domain, history });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('History lookup failed', { domain, error: message });
      // History is a nice-to-have on the results page; an empty list keeps the page working
      res.json({ domain, history: [] });
    }
  });

  return router;
}
