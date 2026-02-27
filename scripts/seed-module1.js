import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStarterTemplates } from '../src/templates/starterTemplates.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(thisDir, '..');

export async function seedModule1({ outFile = 'data/module1-seed.json' } = {}) {
  const seedPayload = {
    module: 'module1',
    seededAt: new Date().toISOString(),
    templates: getStarterTemplates()
  };

  const fullPath = resolve(repoRoot, outFile);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(seedPayload, null, 2) + '\n', 'utf8');

  return fullPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedModule1()
    .then((path) => {
      console.log(`Seeded module1 templates to ${path}`);
    })
    .catch((error) => {
      console.error('Failed to seed module1 templates');
      console.error(error);
      process.exitCode = 1;
    });
}
