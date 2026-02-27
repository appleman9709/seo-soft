import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { seedModule1 } from '../scripts/seed-module1.js';
import { createProject } from '../src/project/createProject.js';

test('seedModule1 writes multilingual starter templates with required entity types', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'seed-module1-'));
  const outFile = join(sandbox, 'module1-seed.json');

  await seedModule1({ outFile });
  const seeded = JSON.parse(await readFile(outFile, 'utf8'));

  assert.equal(seeded.module, 'module1');
  assert.deepEqual(seeded.templates.supportedLanguages, ['en', 'es', 'fr']);

  assert.ok(seeded.templates.meta.product);
  assert.ok(seeded.templates.meta.service);
  assert.ok(seeded.templates.meta.article);
  assert.ok(seeded.templates.meta.category);

  assert.ok(seeded.templates.schema.product.variants.offer);
  assert.ok(seeded.templates.schema.product.variants.aggregateOffer);
  assert.equal(seeded.templates.schema.article.schemaType, 'BlogPosting');
  assert.equal(seeded.templates.schema.faqPage.schemaType, 'FAQPage');
  assert.equal(seeded.templates.schema.organizationLocalBusiness.source, 'projectSettings');
});

test('createProject supports Add starter templates checkbox flag', async () => {
  const baseDir = await mkdtemp(join(tmpdir(), 'project-create-'));

  const withTemplates = await createProject({
    name: 'with-templates',
    addStarterTemplates: true,
    baseDir
  });

  const withoutTemplates = await createProject({
    name: 'without-templates',
    addStarterTemplates: false,
    baseDir
  });

  assert.ok(withTemplates.projectConfig.starterTemplates);
  assert.equal(withoutTemplates.projectConfig.starterTemplates, null);
});
