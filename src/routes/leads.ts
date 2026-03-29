// ============================================================
// AIScore POST /api/leads Route
// Captures lead contact information after a website analysis.
// ============================================================

import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import * as leadsRepository from '../db/leads.repository';
import { logger } from '../logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LeadRequestBody {
  check_id?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
}

interface LeadSuccessResponse {
  success: true;
  message: string;
  lead_id?: string;
}

interface LeadErrorResponse {
  error: string;
  message: string;
}

export function createLeadsRouter(): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LeadRequestBody;

    // ── Validation ─────────────────────────────────────────────────────────────
    const { check_id, name, email, phone, company } = body;

    if (typeof check_id !== 'string' || !UUID_REGEX.test(check_id)) {
      const errBody: LeadErrorResponse = {
        error: 'validation_error',
        message: 'check_id must be a valid UUID',
      };
      res.status(400).json(errBody);
      return;
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      const errBody: LeadErrorResponse = {
        error: 'validation_error',
        message: 'name is required',
      };
      res.status(400).json(errBody);
      return;
    }

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      const errBody: LeadErrorResponse = {
        error: 'validation_error',
        message: 'email must be a valid email address',
      };
      res.status(400).json(errBody);
      return;
    }

    if (typeof phone !== 'string' || phone.trim().length === 0) {
      const errBody: LeadErrorResponse = {
        error: 'validation_error',
        message: 'phone is required',
      };
      res.status(400).json(errBody);
      return;
    }

    const companyValue = typeof company === 'string' ? company : '';

    // ── Persist ────────────────────────────────────────────────────────────────
    try {
      const lead = await leadsRepository.create({
        checkId: check_id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: companyValue,
        phone: phone.trim(),
      });

      logger.info('Lead saved', { leadId: lead.id, checkId: check_id });

      const responseBody: LeadSuccessResponse = {
        success: true,
        message: 'Lead submitted successfully',
        lead_id: lead.id,
      };

      res.status(201).json(responseBody);
    } catch (err) {
      // P2002 that bypassed repository-level deduplication (rare race condition)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const duplicateBody: LeadSuccessResponse = {
          success: true,
          message: 'Already submitted',
        };
        res.status(200).json(duplicateBody);
        return;
      }

      logger.error('Failed to persist lead', { checkId: check_id, err });
      const errBody: LeadErrorResponse = {
        error: 'internal_error',
        message: 'An unexpected error occurred',
      };
      res.status(500).json(errBody);
    }
  });

  return router;
}
