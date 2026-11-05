// ============================================================
// AIScore check store
// Persists every analysis so stats, leaderboard, history and badges have data,
// and so leads (which reference a Check row) can be saved.
// ============================================================

import { ScoreResult } from '../types';
import { getPrisma, isDatabaseConfigured } from '../db';
import { logger } from '../logger';

export interface CheckMeta {
  ipHash: string;
  userAgent?: string | null;
  urlHash: string;
}

export interface LeaderboardEntry {
  rank: number;
  domain: string;
  score: number;
  checks: number;
}

export interface HistoryEntry {
  check_id: string;
  score: number;
  dimensions: ScoreResult['dimensions'];
  checked_at: string;
}

export interface CheckStore {
  readonly kind: 'database' | 'memory';
  record(result: ScoreResult, meta: CheckMeta): Promise<void>;
  totalChecks(): Promise<number>;
  totalDomains(): Promise<number>;
  leaderboard(limit: number): Promise<LeaderboardEntry[]>;
  history(domain: string, limit: number): Promise<HistoryEntry[]>;
  latestScore(domain: string): Promise<number | null>;
}

/** Lower-cases and strips a leading "www." so example.com and www.example.com share a row. */
export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

function rank(rows: Array<{ domain: string; score: number; checks: number }>, limit: number): LeaderboardEntry[] {
  return rows
    .sort((a, b) => b.score - a.score || b.checks - a.checks || a.domain.localeCompare(b.domain))
    .slice(0, limit)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

// ---------------------------------------------------------------------------
// In-memory store (local dev and tests; data lives only as long as the process)
// ---------------------------------------------------------------------------

export function createMemoryCheckStore(): CheckStore {
  const rows: Array<{ result: ScoreResult; domain: string }> = [];

  return {
    kind: 'memory',
    record(result: ScoreResult): Promise<void> {
      rows.push({ result, domain: normalizeDomain(result.domain) });
      return Promise.resolve();
    },
    totalChecks(): Promise<number> {
      return Promise.resolve(rows.length);
    },
    totalDomains(): Promise<number> {
      return Promise.resolve(new Set(rows.map((r) => r.domain)).size);
    },
    leaderboard(limit: number): Promise<LeaderboardEntry[]> {
      const best = new Map<string, { domain: string; score: number; checks: number }>();
      for (const { result, domain } of rows) {
        const entry = best.get(domain) ?? { domain, score: 0, checks: 0 };
        entry.score = Math.max(entry.score, result.score);
        entry.checks += 1;
        best.set(domain, entry);
      }
      return Promise.resolve(rank([...best.values()], limit));
    },
    history(domain: string, limit: number): Promise<HistoryEntry[]> {
      const d = normalizeDomain(domain);
      return Promise.resolve(
        rows
          .filter((r) => r.domain === d)
          .sort((a, b) => b.result.checkedAt.localeCompare(a.result.checkedAt))
          .slice(0, limit)
          .map(({ result }) => ({
            check_id: result.checkId,
            score: result.score,
            dimensions: result.dimensions,
            checked_at: result.checkedAt,
          })),
      );
    },
    latestScore(domain: string): Promise<number | null> {
      const d = normalizeDomain(domain);
      const mine = rows.filter((r) => r.domain === d).sort((a, b) => b.result.checkedAt.localeCompare(a.result.checkedAt));
      return Promise.resolve(mine[0]?.result.score ?? null);
    },
  };
}

// ---------------------------------------------------------------------------
// Postgres store (production) via Prisma
// ---------------------------------------------------------------------------

export function createDatabaseCheckStore(): CheckStore {
  const prisma = getPrisma();

  return {
    kind: 'database',
    async record(result: ScoreResult, meta: CheckMeta): Promise<void> {
      await prisma.check.create({
        data: {
          id: result.checkId,
          domain: normalizeDomain(result.domain),
          urlHash: meta.urlHash,
          score: result.score,
          crawlabilityScore: result.dimensions.crawlability,
          contentScore: result.dimensions.content,
          technicalScore: result.dimensions.technical,
          qualityScore: result.dimensions.quality,
          issues: result.issues,
          checkedAt: new Date(result.checkedAt),
          expiresAt: new Date(result.expiresAt),
          ipHash: meta.ipHash,
          userAgent: meta.userAgent ?? null,
        },
      });
    },
    async totalChecks(): Promise<number> {
      return prisma.check.count();
    },
    async totalDomains(): Promise<number> {
      const groups = await prisma.check.groupBy({ by: ['domain'] });
      return groups.length;
    },
    async leaderboard(limit: number): Promise<LeaderboardEntry[]> {
      const groups = await prisma.check.groupBy({
        by: ['domain'],
        _max: { score: true },
        _count: { _all: true },
        orderBy: { _max: { score: 'desc' } },
        take: limit * 2,
      });
      return rank(
        groups.map((g) => ({ domain: g.domain, score: g._max.score ?? 0, checks: g._count._all })),
        limit,
      );
    },
    async history(domain: string, limit: number): Promise<HistoryEntry[]> {
      const rows = await prisma.check.findMany({
        where: { domain: normalizeDomain(domain) },
        orderBy: { checkedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          score: true,
          crawlabilityScore: true,
          contentScore: true,
          technicalScore: true,
          qualityScore: true,
          checkedAt: true,
        },
      });
      return rows.map((r) => ({
        check_id: r.id,
        score: r.score,
        dimensions: {
          crawlability: r.crawlabilityScore,
          content: r.contentScore,
          technical: r.technicalScore,
          quality: r.qualityScore,
        },
        checked_at: r.checkedAt.toISOString(),
      }));
    },
    async latestScore(domain: string): Promise<number | null> {
      const row = await prisma.check.findFirst({
        where: { domain: normalizeDomain(domain) },
        orderBy: { checkedAt: 'desc' },
        select: { score: true },
      });
      return row?.score ?? null;
    },
  };
}

export function createCheckStore(): CheckStore {
  if (isDatabaseConfigured()) {
    logger.info('Check store: Postgres');
    return createDatabaseCheckStore();
  }
  logger.warn('Check store: DATABASE_URL not set, using in-memory store (data is lost on restart)');
  return createMemoryCheckStore();
}
