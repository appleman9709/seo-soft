# seo-soft

## JSON export

Use `exportProjectToJson` to build an export payload that can be consumed by an integrator without additional transformations.

```js
const { exportProjectToJson } = require('./src/jsonExport');

const payload = exportProjectToJson({
  project: { id: 'project-1' },
  rows: [
    {
      url: '/products/1',
      entityType: 'product',
      status: 'ready',
      languages: {
        ru: { title: '...', description: '...', h1: '...', schemaJsonLd: {}, validations: [] },
      },
    },
  ],
});
```

Payload shape:

```json
{
  "project": {},
  "exportedAt": "2026-02-26T00:00:00.000Z",
  "rows": [
    {
      "url": "",
      "entityType": "",
      "status": "",
      "languages": {
        "ru": { "title": "", "description": "", "h1": "", "schemaJsonLd": null, "validations": [] },
        "kk": { "title": "", "description": "", "h1": "", "schemaJsonLd": null, "validations": [] },
        "en": { "title": "", "description": "", "h1": "", "schemaJsonLd": null, "validations": [] }
      }
    }
  ]
}
```
