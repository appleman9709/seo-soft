import React, { useMemo, useState } from 'react';

type ParsedRow = Record<string, string>;
type Mapping = Record<string, string>;

const fieldOptions = ['url', 'entityType', 'name'];
const headerSuggestions: Record<string, string> = {
  url: 'url',
  ссылка: 'url',
  entity: 'entityType',
  'тип сущности': 'entityType',
  name: 'name',
  название: 'name',
};

function parseCsv(content: string): ParsedRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    return headers.reduce<ParsedRow>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

export default function ImportPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [response, setResponse] = useState<unknown>(null);

  const headers = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);

  async function onFileChange(nextFile: File | null): Promise<void> {
    if (!nextFile) return;
    setFile(nextFile);

    const text = await nextFile.text();
    const parsed = parseCsv(text);
    setRows(parsed);

    const autoMapping: Mapping = {};
    Object.keys(parsed[0] ?? {}).forEach((header) => {
      const key = header.toLowerCase();
      autoMapping[header] = headerSuggestions[key] ?? '';
    });
    setMapping(autoMapping);
  }

  async function submitImport(): Promise<void> {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    const res = await fetch('/module1/import', { method: 'POST', body: formData });
    const json = await res.json();
    setResponse(json);
  }

  return (
    <main>
      <h1>Module1 Import</h1>
      <input type="file" accept=".csv,.xlsx" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />

      {headers.length > 0 && (
        <section>
          <h2>Column mapping</h2>
          {headers.map((header) => (
            <div key={header}>
              <label>{header}</label>
              <select
                value={mapping[header] ?? ''}
                onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
              >
                <option value="">Skip</option>
                {fieldOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={`attr_${header}`}>{`attr_${header}`}</option>
              </select>
            </div>
          ))}
        </section>
      )}

      {rows.length > 0 && (
        <section>
          <h2>Preview (first 20)</h2>
          <pre>{JSON.stringify(rows.slice(0, 20), null, 2)}</pre>
        </section>
      )}

      <button type="button" onClick={submitImport} disabled={!file}>
        Submit import
      </button>

      {response && (
        <section>
          <h2>Import response</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
