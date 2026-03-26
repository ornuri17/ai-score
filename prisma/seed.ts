// ============================================================
// AIScore DB Seed — 2-3 example Check records for local dev
// Run: npx ts-node prisma/seed.ts
// ============================================================

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

const seeds = [
  {
    domain: 'example.com',
    url: 'https://example.com',
    score: 78,
    crawlabilityScore: 25,
    contentScore: 28,
    technicalScore: 17,
    qualityScore: 8,
    issues: ['structured_data_missing'],
  },
  {
    domain: 'openai.com',
    url: 'https://openai.com',
    score: 91,
    crawlabilityScore: 30,
    contentScore: 33,
    technicalScore: 22,
    qualityScore: 10,
    issues: [],
  },
  {
    domain: 'test-no-https.com',
    url: 'http://test-no-https.com',
    score: 44,
    crawlabilityScore: 15,
    contentScore: 18,
    technicalScore: 7,
    qualityScore: 4,
    issues: ['no_https', 'structured_data_missing', 'no_internal_links'],
  },
];

async function main(): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const seed of seeds) {
    const urlHash = sha256(`https://${seed.domain}`);
    try {
      const check = await prisma.check.upsert({
        where: { urlHash },
        update: {},
        create: {
          domain: seed.domain,
          urlHash,
          score: seed.score,
          crawlabilityScore: seed.crawlabilityScore,
          contentScore: seed.contentScore,
          technicalScore: seed.technicalScore,
          qualityScore: seed.qualityScore,
          issues: seed.issues,
          checkedAt: now,
          expiresAt,
          ipHash: sha256('seed-script'),
        },
      });
      // eslint-disable-next-line no-console
      console.info(`Seeded check for ${seed.domain} (id: ${check.id})`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to seed ${seed.domain}:`, err);
    }
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
