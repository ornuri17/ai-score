import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function createAdminRouter(): Router {
  const router = Router();

  // GET /api/admin/leads
  // Returns all leads as JSON or CSV depending on Accept header / ?format=csv
  router.get('/leads', async (req: Request, res: Response): Promise<void> => {
    try {
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          ctoStatus: true,
          createdAt: true,
          check: {
            select: { domain: true, score: true },
          },
        },
      });

      const format = req.query['format'];
      if (format === 'csv' || req.headers['accept'] === 'text/csv') {
        const rows = [
          ['id', 'name', 'email', 'phone', 'company', 'domain', 'score', 'status', 'created_at'],
          ...leads.map((l) => [
            l.id,
            l.name,
            l.email,
            l.phone ?? '',
            l.company ?? '',
            l.check.domain,
            l.check.score,
            l.ctoStatus,
            l.createdAt.toISOString(),
          ]),
        ]
          .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
        res.send(rows);
        return;
      }

      res.json({ total: leads.length, leads });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
