import multipart from '@fastify/multipart';
import { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { deterministicGeneration } from '../services/generator.js';

const createProjectSchema = z.object({
  name: z.string().min(2),
  domain: z.string().min(2),
  languages: z.array(z.string()).min(1),
  rules: z.record(z.unknown()).default({})
});

const importSchema = z.object({
  mappingPreset: z.string(),
  rows: z
    .array(
      z.object({
        url: z.string().url(),
        entityType: z.string(),
        sourceFields: z.record(z.unknown())
      })
    )
    .min(1)
});

export async function module1Routes(app: FastifyInstance) {
  await app.register(multipart);

  app.post('/projects', async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const project = await prisma.project.create({ data: body });
    return reply.code(201).send(project);
  });

  app.post('/projects/:id/import', async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = importSchema.parse(request.body);

    const created = await prisma.$transaction(
      body.rows.map((row) =>
        prisma.row.create({
          data: {
            projectId: params.id,
            url: row.url,
            entityType: row.entityType,
            sourceFields: row.sourceFields
          }
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        projectId: params.id,
        actor: 'system',
        action: 'IMPORT_ROWS',
        payload: { mappingPreset: body.mappingPreset, count: created.length }
      }
    });

    return { imported: created.length, mappingPreset: body.mappingPreset };
  });

  app.post('/projects/:id/generate', async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ actor: z.string().default('system') }).parse(request.body ?? {});

    const project = await prisma.project.findUniqueOrThrow({ where: { id: params.id } });
    const rows = await prisma.row.findMany({ where: { projectId: params.id } });
    const templates = await prisma.template.findMany({ where: { projectId: params.id } });

    const results = [] as { rowId: string; lang: string }[];
    for (const row of rows) {
      for (const lang of project.languages) {
        const generated = deterministicGeneration(row, templates, lang);
        const result = await prisma.generationResult.create({
          data: {
            rowId: row.id,
            projectId: params.id,
            lang,
            ...generated,
            createdBy: body.actor
          }
        });
        results.push({ rowId: result.rowId, lang: result.lang });
      }
    }

    return { generated: results.length, results };
  });

  app.patch('/rows/:id', async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        url: z.string().url().optional(),
        sourceFields: z.record(z.unknown()).optional(),
        status: z.enum(['Draft', 'Review', 'Approved', 'Exported']).optional()
      })
      .refine((value) => Object.keys(value).length > 0, 'At least one field required')
      .parse(request.body);

    return prisma.row.update({ where: { id: params.id }, data: body });
  });

  app.post('/rows/bulk', async (request) => {
    const body = z.object({ operation: z.string(), rowIds: z.array(z.string()).min(1) }).parse(request.body);
    return { accepted: true, operation: body.operation, rowCount: body.rowIds.length };
  });

  app.get('/projects/:id/export', async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const query = z.object({ format: z.enum(['csv', 'xlsx', 'json', 'html']) }).parse(request.query);

    return { projectId: params.id, format: query.format, status: 'queued', note: 'Export placeholder response' };
  });

  app.get('/projects/:id/report', async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const totalRows = await prisma.row.count({ where: { projectId: params.id } });
    const totalGenerated = await prisma.generationResult.count({ where: { projectId: params.id } });
    return {
      projectId: params.id,
      summary: { totalRows, totalGenerated },
      checks: ['metadata coverage', 'schema completeness'],
      status: 'placeholder'
    };
  });
}
