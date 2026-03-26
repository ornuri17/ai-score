import { prisma } from './client';

export async function increment(key: string, expiresAt: Date): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    INSERT INTO "RateLimit" (id, key, count, "expiresAt")
    VALUES (gen_random_uuid(), ${key}, 1, ${expiresAt})
    ON CONFLICT (key) DO UPDATE
      SET count = "RateLimit".count + 1
    RETURNING count
  `;
  return Number(result[0]?.count ?? 1);
}

export async function deleteExpired(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
