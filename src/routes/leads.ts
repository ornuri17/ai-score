// ============================================================
// AIScore /api/leads route
// POST — validate and log a lead capture submission.
// ============================================================

import { Request, Response, RequestHandler } from 'express';
import { LeadRequest } from '../types';
import { logger } from '../logger';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createLeadsRouter(): RequestHandler {
  return (req: Request, res: Response): void => {
    const body = req.body as Partial<LeadRequest>;

    const { checkId, name, email, company, phone } = body;

    if (name == null || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    if (email == null || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }

    logger.info('Lead captured', {
      checkId: checkId ?? null,
      name: name.trim(),
      email: email.trim(),
      company: company?.trim() ?? null,
      phone: phone ?? null,
    });

    res.json({ success: true });
  };
}
