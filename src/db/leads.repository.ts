import { Lead, Prisma } from '@prisma/client';
import { prisma } from './client';

export interface CreateLeadInput {
  checkId: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  budgetRange?: string;
  timeline?: string;
  ctoStatus?: string;
}

export async function create(data: CreateLeadInput): Promise<Lead> {
  try {
    return await prisma.lead.create({
      data: {
        checkId: data.checkId,
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        budgetRange: data.budgetRange,
        timeline: data.timeline,
        ctoStatus: data.ctoStatus ?? 'new',
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Unique constraint violation — return existing lead
      const existing = await prisma.lead.findUnique({
        where: {
          checkId_email: {
            checkId: data.checkId,
            email: data.email,
          },
        },
      });
      if (existing !== null) {
        return existing;
      }
    }
    throw err;
  }
}

export async function findByEmail(email: string): Promise<Lead[]> {
  return prisma.lead.findMany({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
}
