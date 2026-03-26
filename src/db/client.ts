// ============================================================
// AIScore DB Client — stub for parallel workstream integration
// The scoring workstream will replace this with the real Prisma client.
// ============================================================

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-type-assertion */

import { PrismaClient } from '@prisma/client';

interface PrismaGlobal {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma?: any;
}

const globalForPrisma = globalThis as unknown as PrismaGlobal;

const client = (globalForPrisma.prisma ?? new PrismaClient()) as PrismaClient;

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = client;
}

export const prisma: PrismaClient = client;
