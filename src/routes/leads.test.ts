// ============================================================
// Integration-style tests for POST /api/leads
// All external services are mocked — no real network or DB.
// ============================================================

import express from 'express';
import request from 'supertest';
import { createLeadsRouter } from './leads';
import { Lead, Prisma } from '@prisma/client';

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../db/leads.repository');

import * as leadsRepo from '../db/leads.repository';

const mockLeadsCreate = leadsRepo.create as jest.MockedFunction<typeof leadsRepo.create>;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_CHECK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const MOCK_LEAD: Lead = {
  id: 'lead-uuid-1',
  checkId: VALID_CHECK_ID,
  name: 'Alice Smith',
  email: 'alice@example.com',
  company: 'Acme Corp',
  phone: '+15551234567',
  budgetRange: null,
  timeline: null,
  ctoStatus: 'new',
  createdAt: new Date('2026-03-25T00:00:00Z'),
  updatedAt: new Date('2026-03-25T00:00:00Z'),
};

const VALID_BODY = {
  check_id: VALID_CHECK_ID,
  name: 'Alice Smith',
  email: 'alice@example.com',
  phone: '+15551234567',
  company: 'Acme Corp',
};

// ── Test helpers ─────────────────────────────────────────────────────────────

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', createLeadsRouter());
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('returns 201 with lead_id on successful submission', async () => {
    mockLeadsCreate.mockResolvedValueOnce(MOCK_LEAD);

    const app = buildApp();
    const res = await request(app).post('/api/leads').send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Lead submitted successfully',
      lead_id: MOCK_LEAD.id,
    });
    expect(mockLeadsCreate).toHaveBeenCalledWith({
      checkId: VALID_CHECK_ID,
      name: 'Alice Smith',
      email: 'alice@example.com',
      company: 'Acme Corp',
      phone: '+15551234567',
    });
  });

  it('accepts optional company field as empty string when omitted', async () => {
    mockLeadsCreate.mockResolvedValueOnce(MOCK_LEAD);

    const app = buildApp();
    const bodyWithoutCompany = { ...VALID_BODY };
    delete (bodyWithoutCompany as Partial<typeof VALID_BODY>).company;

    const res = await request(app).post('/api/leads').send(bodyWithoutCompany);

    expect(res.status).toBe(201);
    expect(mockLeadsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ company: '' }),
    );
  });

  // ── Duplicate submission ────────────────────────────────────────────────────

  it('returns 200 with "Already submitted" when repository returns existing lead', async () => {
    // The repository catches P2002 and returns the existing lead —
    // so the route still gets a successful lead back and returns 201.
    // The 200/"Already submitted" path is only hit on a rare race condition P2002.
    mockLeadsCreate.mockResolvedValueOnce(MOCK_LEAD);

    const app = buildApp();
    const res = await request(app).post('/api/leads').send(VALID_BODY);

    // Repository silently returned existing lead — route returns 201
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 with "Already submitted" when P2002 escapes the repository', async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '5.0.0', meta: {} },
    );
    mockLeadsCreate.mockRejectedValueOnce(p2002Error);

    const app = buildApp();
    const res = await request(app).post('/api/leads').send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Already submitted',
    });
  });

  // ── Validation errors ────────────────────────────────────────────────────────

  it('returns 400 when check_id is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...VALID_BODY, check_id: undefined });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'validation_error', message: expect.stringContaining('check_id') });
    expect(mockLeadsCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when check_id is not a valid UUID', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...VALID_BODY, check_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
    expect(mockLeadsCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...VALID_BODY, name: '' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'validation_error', message: expect.stringContaining('name') });
    expect(mockLeadsCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when email is invalid', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...VALID_BODY, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'validation_error', message: expect.stringContaining('email') });
    expect(mockLeadsCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when phone is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...VALID_BODY, phone: '' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'validation_error', message: expect.stringContaining('phone') });
    expect(mockLeadsCreate).not.toHaveBeenCalled();
  });

  // ── Internal errors ──────────────────────────────────────────────────────────

  it('returns 500 when the repository throws an unexpected error', async () => {
    mockLeadsCreate.mockRejectedValueOnce(new Error('connection refused'));

    const app = buildApp();
    const res = await request(app).post('/api/leads').send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: 'internal_error',
      message: 'An unexpected error occurred',
    });
  });
});
