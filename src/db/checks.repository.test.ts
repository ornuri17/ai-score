import { prisma } from './client';
import { findByUrlHash, findByDomain, create, CreateCheckInput } from './checks.repository';
import { Check } from '@prisma/client';

jest.mock('./client', () => ({
  prisma: {
    check: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

interface MockCheckDelegate {
  findFirst: jest.Mock;
  create: jest.Mock;
  deleteMany: jest.Mock;
}

interface MockedPrisma {
  check: MockCheckDelegate;
}

const mockPrismaCheck = (prisma as unknown as MockedPrisma).check;

const makeCheck = (overrides: Partial<Check> = {}): Check => ({
  id: 'uuid-1',
  domain: 'example.com',
  urlHash: 'hash-abc',
  score: 80,
  crawlabilityScore: 25,
  contentScore: 28,
  technicalScore: 20,
  qualityScore: 7,
  issues: [],
  checkedAt: new Date('2026-03-25T00:00:00Z'),
  expiresAt: new Date('2026-04-01T00:00:00Z'),
  ipHash: 'iphash-1',
  userAgent: null,
  languageDetected: null,
  referrerSource: null,
  createdAt: new Date('2026-03-25T00:00:00Z'),
  ...overrides,
});

interface FindFirstCallArg {
  where: {
    urlHash?: string;
    domain?: string;
    expiresAt: { gt: Date };
  };
  orderBy?: { checkedAt: string };
}

interface CreateCallArg {
  data: {
    domain: string;
    urlHash: string;
    score: number;
    issues: string[];
  };
}

function getFirstCallArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as T[][];
  const firstCall = calls[0];
  if (firstCall === undefined) {
    throw new Error('Mock was not called');
  }
  const arg = firstCall[0];
  if (arg === undefined) {
    throw new Error('Mock call had no arguments');
  }
  return arg;
}

describe('checks.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUrlHash', () => {
    it('returns null when not found', async () => {
      mockPrismaCheck.findFirst.mockResolvedValueOnce(null);

      const result = await findByUrlHash('nonexistent-hash');

      expect(result).toBeNull();
      expect(mockPrismaCheck.findFirst).toHaveBeenCalledTimes(1);
    });

    it('filters out expired checks by querying expiresAt > now', async () => {
      mockPrismaCheck.findFirst.mockResolvedValueOnce(null);

      const before = new Date();
      await findByUrlHash('some-hash');

      const arg = getFirstCallArg<FindFirstCallArg>(mockPrismaCheck.findFirst);
      expect(arg.where.urlHash).toBe('some-hash');
      expect(arg.where.expiresAt.gt).toBeInstanceOf(Date);
      expect(arg.where.expiresAt.gt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100);
    });

    it('returns the check when found and not expired', async () => {
      const check = makeCheck();
      mockPrismaCheck.findFirst.mockResolvedValueOnce(check);

      const result = await findByUrlHash('hash-abc');

      expect(result).toEqual(check);
    });
  });

  describe('findByDomain', () => {
    it('returns null when no non-expired check exists for domain', async () => {
      mockPrismaCheck.findFirst.mockResolvedValueOnce(null);

      const result = await findByDomain('example.com');

      expect(result).toBeNull();
    });

    it('queries with domain filter, expiresAt > now, ordered by checkedAt desc', async () => {
      mockPrismaCheck.findFirst.mockResolvedValueOnce(null);

      await findByDomain('example.com');

      const arg = getFirstCallArg<FindFirstCallArg>(mockPrismaCheck.findFirst);
      expect(arg.where.domain).toBe('example.com');
      expect(arg.where.expiresAt.gt).toBeInstanceOf(Date);
      expect(arg.orderBy).toEqual({ checkedAt: 'desc' });
    });
  });

  describe('create', () => {
    it('calls prisma.check.create with the correct shape', async () => {
      const check = makeCheck();
      mockPrismaCheck.create.mockResolvedValueOnce(check);

      const input: CreateCheckInput = {
        domain: 'example.com',
        urlHash: 'hash-abc',
        score: 80,
        crawlabilityScore: 25,
        contentScore: 28,
        technicalScore: 20,
        qualityScore: 7,
        issues: ['no_https'],
        checkedAt: new Date('2026-03-25T00:00:00Z'),
        expiresAt: new Date('2026-04-01T00:00:00Z'),
        ipHash: 'iphash-1',
      };

      const result = await create(input);

      expect(result).toEqual(check);
      expect(mockPrismaCheck.create).toHaveBeenCalledTimes(1);

      const arg = getFirstCallArg<CreateCallArg>(mockPrismaCheck.create);
      expect(arg.data.domain).toBe('example.com');
      expect(arg.data.urlHash).toBe('hash-abc');
      expect(arg.data.score).toBe(80);
      expect(arg.data.issues).toEqual(['no_https']);
    });
  });
});
