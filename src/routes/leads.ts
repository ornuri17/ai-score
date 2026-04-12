import { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { LeadRequest } from '../types';
import { logger } from '../logger';

const prisma = new PrismaClient();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createLeadsRouter(): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
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

    if (checkId == null || typeof checkId !== 'string' || checkId.trim() === '') {
      res.status(400).json({ error: 'checkId is required' });
      return;
    }

    try {
      await prisma.lead.upsert({
        where: { checkId_email: { checkId, email: email.trim() } },
        update: {
          name: name.trim(),
          phone: phone?.trim() ?? null,
          company: company?.trim() ?? '',
        },
        create: {
          checkId,
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() ?? null,
          company: company?.trim() ?? '',
        },
      });

      logger.info('Lead saved', { checkId, email: email.trim() });
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to save lead', { error: message });
      res.status(500).json({ error: 'Failed to save lead' });
    }
  };
}
