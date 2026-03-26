import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../logger';

type LoggedPrismaClient = PrismaClient<{
  log: [
    { emit: 'event'; level: 'error' },
    { emit: 'event'; level: 'warn' },
  ];
}>;

const globalForPrisma = globalThis as unknown as { prisma: LoggedPrismaClient };

function createPrismaClient(): LoggedPrismaClient {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  }) as LoggedPrismaClient;
}

export const prisma: LoggedPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

prisma.$on('error', (e: Prisma.LogEvent) =>
  logger.error('Prisma error', { message: e.message }),
);
prisma.$on('warn', (e: Prisma.LogEvent) =>
  logger.warn('Prisma warning', { message: e.message }),
);

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
