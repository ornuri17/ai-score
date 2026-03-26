import { Check } from '@prisma/client';
import { IssueKey } from '../types';
import { prisma } from './client';

export interface CreateCheckInput {
  domain: string;
  urlHash: string;
  score: number;
  crawlabilityScore: number;
  contentScore: number;
  technicalScore: number;
  qualityScore: number;
  issues: IssueKey[];
  checkedAt: Date;
  expiresAt: Date;
  ipHash: string;
  userAgent?: string;
  languageDetected?: string;
  referrerSource?: string;
}

export async function findByUrlHash(urlHash: string): Promise<Check | null> {
  return prisma.check.findFirst({
    where: {
      urlHash,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function findByDomain(domain: string): Promise<Check | null> {
  return prisma.check.findFirst({
    where: {
      domain,
      expiresAt: { gt: new Date() },
    },
    orderBy: { checkedAt: 'desc' },
  });
}

export async function create(data: CreateCheckInput): Promise<Check> {
  return prisma.check.create({
    data: {
      domain: data.domain,
      urlHash: data.urlHash,
      score: data.score,
      crawlabilityScore: data.crawlabilityScore,
      contentScore: data.contentScore,
      technicalScore: data.technicalScore,
      qualityScore: data.qualityScore,
      issues: data.issues,
      checkedAt: data.checkedAt,
      expiresAt: data.expiresAt,
      ipHash: data.ipHash,
      userAgent: data.userAgent,
      languageDetected: data.languageDetected,
      referrerSource: data.referrerSource,
    },
  });
}

export async function deleteExpired(): Promise<number> {
  const result = await prisma.check.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
