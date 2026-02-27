import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';

const mockPrisma = {
  project: {
    create: vi.fn(),
    findUniqueOrThrow: vi.fn()
  },
  row: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn()
  },
  template: {
    findMany: vi.fn()
  },
  generationResult: {
    create: vi.fn(),
    count: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  $transaction: vi.fn()
};

vi.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma
}));

describe('module1 routes smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates project', async () => {
    mockPrisma.project.create.mockResolvedValue({ id: 'p1', name: 'A', domain: 'a.com', languages: ['en'], rules: {} });
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/module1/projects',
      payload: { name: 'Alpha', domain: 'https://example.com', languages: ['en'], rules: {} }
    });

    expect(response.statusCode).toBe(201);
  });

  it('returns placeholder export', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/module1/projects/p1/export?format=csv'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('queued');
  });
});
