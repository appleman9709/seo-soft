export type RowStatus = 'Draft' | 'Review' | 'Approved' | 'Exported';
export type TemplateKind = 'meta' | 'schema';

export interface ProjectDTO {
  id: string;
  name: string;
  domain: string;
  languages: string[];
  rules: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  domain: string;
  languages: string[];
  rules?: Record<string, unknown>;
}

export interface RowDTO {
  id: string;
  projectId: string;
  url: string;
  entityType: string;
  sourceFields: Record<string, unknown>;
  status: RowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationResultDTO {
  id: string;
  rowId: string;
  lang: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  schemaJsonLd: string;
  validations: Record<string, unknown>;
  version: number;
  createdAt: string;
  createdBy: string;
}

export interface ImportPayload {
  mappingPreset: string;
  rows: Array<{
    url: string;
    entityType: string;
    sourceFields: Record<string, unknown>;
  }>;
}
