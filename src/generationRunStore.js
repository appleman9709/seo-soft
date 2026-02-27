import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_FILE = new URL('../data/generation-runs.json', import.meta.url);

function ensureStoreFile() {
  const filePath = DB_FILE.pathname;
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify({ generationRuns: [] }, null, 2));
  }
}

function readStore() {
  ensureStoreFile();
  return JSON.parse(readFileSync(DB_FILE, 'utf8'));
}

function writeStore(store) {
  writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
}

export function createGenerationRun(run) {
  const store = readStore();
  store.generationRuns.push(run);
  writeStore(store);
  return run;
}

export function getGenerationRun(id) {
  const store = readStore();
  return store.generationRuns.find((run) => run.id === id) ?? null;
}

export function updateGenerationRun(id, update) {
  const store = readStore();
  const runIndex = store.generationRuns.findIndex((run) => run.id === id);
  if (runIndex === -1) {
    return null;
  }

  store.generationRuns[runIndex] = {
    ...store.generationRuns[runIndex],
    ...update
  };
  writeStore(store);
  return store.generationRuns[runIndex];
}
