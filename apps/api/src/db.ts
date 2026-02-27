import { randomUUID } from 'node:crypto';
import type { ImportPreset, Mapping, Row } from './types.js';

const rows: Row[] = [];
const presets: ImportPreset[] = [];

export function createRow(data: Omit<Row, 'id'>): Row {
  const row: Row = { id: randomUUID(), ...data };
  rows.push(row);
  return row;
}

export function listRows(): Row[] {
  return [...rows];
}

export function saveImportPreset(projectId: string, name: string, mapping: Mapping): ImportPreset {
  const preset: ImportPreset = {
    id: randomUUID(),
    projectId,
    name,
    mapping,
  };
  presets.push(preset);
  return preset;
}

export function listImportPresets(projectId: string): ImportPreset[] {
  return presets.filter((preset) => preset.projectId === projectId);
}

export function resetDb(): void {
  rows.length = 0;
  presets.length = 0;
}
