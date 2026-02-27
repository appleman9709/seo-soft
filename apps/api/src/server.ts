import express from 'express';
import multer from 'multer';
import { createRow, listImportPresets, saveImportPreset } from './db.js';
import { normalizeRows, parseInputFile, processImport } from './importer.js';
import type { Mapping } from './types.js';

export const app = express();
const upload = multer();

app.use(express.json());

app.post('/module1/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required.' });

    const projectId = String(req.body.projectId ?? 'default-project');
    const mapping = JSON.parse(String(req.body.mapping ?? '{}')) as Mapping;

    const parsedRows = parseInputFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    const normalizedRows = normalizeRows(parsedRows, mapping);
    const result = processImport(normalizedRows);

    normalizedRows.forEach((row) => {
      if (row.url && row.entityType && row.name) {
        createRow({
          projectId,
          url: String(row.url),
          entityType: String(row.entityType),
          name: String(row.name),
          sourceFields: row.sourceFields,
        });
      }
    });

    if (req.body.presetName) {
      saveImportPreset(projectId, String(req.body.presetName), mapping);
    }

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/module1/import-presets/:projectId', (req, res) => res.json(listImportPresets(req.params.projectId)));

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.log(`API listening on ${port}`);
  });
}
