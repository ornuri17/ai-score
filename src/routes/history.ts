// ============================================================
// AIScore /api/history route
// GET /:domain — stub returning empty history (DB not wired yet).
// ============================================================

import { Router, Request, Response } from 'express';
import { logger } from '../logger';

export function createHistoryRouter(): Router {
  const router = Router();

  router.get('/:domain', (req: Request, res: Response): void => {
    const { domain } = req.params;
    logger.debug('History requested', { domain });
    res.json({ domain, history: [] });
  });

  return router;
}
