// ============================================================
// AIScore database client
// One shared PrismaClient per process (one per Lambda container).
// ============================================================

import { PrismaClient } from '@prisma/client';

let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (client === null) {
    client = new PrismaClient();
  }
  return client;
}

/** True when a real database is configured (not the local-dev default). */
export function isDatabaseConfigured(): boolean {
  const url = process.env['DATABASE_URL'];
  return url !== undefined && url.trim() !== '';
}
