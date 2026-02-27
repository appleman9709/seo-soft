const statuses = ["ready", "draft", "paused"];
const entityTypes = ["hotel", "restaurant", "store"];

function createRows(count) {
  const rows = [];
  for (let i = 1; i <= count; i += 1) {
    rows.push({
      id: String(i),
      status: statuses[i % statuses.length],
      entityType: entityTypes[i % entityTypes.length],
      sourceFields: {
        name: `Entity ${i}`,
        brand: `Brand ${((i - 1) % 20) + 1}`,
        city: ["Berlin", "Paris", "Madrid", "Lisbon"][i % 4],
        price_from: 50 + (i % 200),
        attrs: {
          wifi: i % 2 === 0 ? "yes" : "no",
          parking: i % 3 === 0 ? "yes" : "no",
          pets: i % 5 === 0 ? "yes" : "no"
        },
        category: entityTypes[i % entityTypes.length]
      }
    });
  }

  return rows;
}

export const store = {
  projects: [
    {
      id: "1",
      name: "Default project",
      rows: createRows(1000)
    }
  ],
  templates: [
    {
      id: "title-default",
      type: "meta",
      name: "Default Title",
      targetField: "title",
      content: "{{name}} in {{city}} by {{brand}} from {{price_from}}",
      schemaFields: ["name", "city", "brand", "price_from"],
      maxLength: 60
    },
    {
      id: "description-default",
      type: "meta",
      name: "Default Description",
      targetField: "description",
      content: "Discover {{name}} ({{category}}) in {{city}}. Amenities: {{attrs}}. Prices from {{price_from}}.",
      schemaFields: ["name", "category", "city", "attrs", "price_from"],
      maxLength: 160
    },
    {
      id: "faq-default",
      type: "schema",
      name: "FAQ Snippet",
      targetField: "faq",
      content: "What makes {{name}} special in {{city}}? It offers {{attrs}}.",
      schemaFields: ["name", "city", "attrs"],
      maxLength: 300
    }
  ],
  generationResults: [],
  jobs: []
};

export function getProject(projectId) {
  return store.projects.find((project) => project.id === projectId);
}

export function getDefaultTemplateIds() {
  return ["title-default", "description-default"];
}
