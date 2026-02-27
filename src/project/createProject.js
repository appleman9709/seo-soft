import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getStarterTemplates } from '../templates/starterTemplates.js';

export async function createProject({
  name,
  addStarterTemplates = false,
  baseDir = process.cwd()
}) {
  if (!name?.trim()) {
    throw new Error('Project name is required.');
  }

  const projectDir = resolve(baseDir, name);
  await mkdir(projectDir, { recursive: true });

  const projectConfig = {
    name,
    createdAt: new Date().toISOString(),
    starterTemplates: addStarterTemplates ? getStarterTemplates() : null
  };

  await writeFile(
    resolve(projectDir, 'project.json'),
    JSON.stringify(projectConfig, null, 2) + '\n',
    'utf8'
  );

  return { projectDir, projectConfig };
}
