export type InternalFieldName = 'url' | 'entityType' | 'name' | string;

export type Mapping = Record<string, InternalFieldName>;

export interface Warning {
  rowIndex: number;
  code: 'MISSING_REQUIRED' | 'DUPLICATE_URL';
  message: string;
}

export interface NormalizedRow {
  rowIndex: number;
  url?: string;
  entityType?: string;
  name?: string;
  sourceFields: Record<string, unknown>;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  warnings: Warning[];
  sample: NormalizedRow[];
}

export interface Row {
  id: string;
  projectId: string;
  url: string;
  entityType: string;
  name: string;
  sourceFields: Record<string, unknown>;
}

export interface ImportPreset {
  id: string;
  projectId: string;
  name: string;
  mapping: Mapping;
}
