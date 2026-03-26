import { prisma } from './client';
import { create, findByEmail, CreateLeadInput } from './leads.repository';
import { Lead, Prisma } from '@prisma/client';

jest.mock('./client', () => ({
  prisma: {
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  lead: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
};

const makeLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-uuid-1',
  checkId: 'check-uuid-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  company: 'Acme Corp',
  phone: null,
  budgetRange: null,
  timeline: null,
  ctoStatus: 'new',
  createdAt: new Date('2026-03-25T00:00:00Z'),
  updatedAt: new Date('2026-03-25T00:00:00Z'),
  ...overrides,
});

const makeInput = (overrides: Partial<CreateLeadInput> = {}): CreateLeadInput => ({
  checkId: 'check-uuid-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  company: 'Acme Corp',
  ...overrides,
});

describe('leads.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates and returns a new lead on success', async () => {
      const lead = makeLead();
      mockPrisma.lead.create.mockResolvedValueOnce(lead);

      const result = await create(makeInput());

      expect(result).toEqual(lead);
      expect(mockPrisma.lead.create).toHaveBeenCalledTimes(1);
    });

    it('returns the existing lead on unique constraint violation (P2002)', async () => {
      const existingLead = makeLead();

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: {} },
      );

      mockPrisma.lead.create.mockRejectedValueOnce(p2002Error);
      mockPrisma.lead.findUnique.mockResolvedValueOnce(existingLead);

      const result = await create(makeInput());

      expect(result).toEqual(existingLead);
      expect(mockPrisma.lead.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.lead.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: {
          checkId_email: {
            checkId: 'check-uuid-1',
            email: 'alice@example.com',
          },
        },
      });
    });

    it('re-throws non-P2002 errors', async () => {
      const networkError = new Error('Connection refused');
      mockPrisma.lead.create.mockRejectedValueOnce(networkError);

      await expect(create(makeInput())).rejects.toThrow('Connection refused');
    });

    it('re-throws P2002 errors when existing lead lookup returns null', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: {} },
      );

      mockPrisma.lead.create.mockRejectedValueOnce(p2002Error);
      mockPrisma.lead.findUnique.mockResolvedValueOnce(null);

      await expect(create(makeInput())).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('findByEmail', () => {
    it('returns an array of leads for a given email', async () => {
      const leads = [makeLead(), makeLead({ id: 'lead-uuid-2', checkId: 'check-uuid-2' })];
      mockPrisma.lead.findMany.mockResolvedValueOnce(leads);

      const result = await findByEmail('alice@example.com');

      expect(result).toEqual(leads);
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when no leads found', async () => {
      mockPrisma.lead.findMany.mockResolvedValueOnce([]);

      const result = await findByEmail('nobody@example.com');

      expect(result).toEqual([]);
    });
  });
});
