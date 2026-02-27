import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('prisma schema', () => {
  it('contains required models', () => {
    const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model Project');
    expect(schema).toContain('model Template');
    expect(schema).toContain('model Row');
    expect(schema).toContain('model GenerationResult');
    expect(schema).toContain('model AuditLog');
  });
});
