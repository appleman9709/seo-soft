const ROOT_PATH = "";

function addIssue(collection, path, message) {
  collection.push({ path, message });
}

function pointer(base, key) {
  const escapedKey = String(key).replace(/~/g, "~0").replace(/\//g, "~1");
  if (!base) {
    return `/${escapedKey}`;
  }

  return `${base}/${escapedKey}`;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(schema) {
  return Array.isArray(schema) ? schema : [schema];
}

function includesType(typeValue, expectedType) {
  if (Array.isArray(typeValue)) {
    return typeValue.includes(expectedType);
  }

  return typeValue === expectedType;
}

function validateProduct(node, path, warnings, errors) {
  if (!node.name) {
    addIssue(errors, pointer(path, "name"), "Product requires a name.");
  }

  if (!node.image) {
    addIssue(warnings, pointer(path, "image"), "Product should include an image.");
  }

  const hasOffers = Boolean(node.offers || node.aggregateOffer || node.aggregateOffers);
  if (!hasOffers) {
    addIssue(
      warnings,
      path,
      "Product should include offers or aggregateOffer for richer search results.",
    );
  }

  if (node.offers) {
    const offers = asArray(node.offers);
    offers.forEach((offer, index) => {
      const offerPath = Array.isArray(node.offers) ? pointer(pointer(path, "offers"), index) : pointer(path, "offers");

      if (!isObject(offer)) {
        addIssue(errors, offerPath, "Product offers must be an object or array of objects.");
        return;
      }

      if (!offer.availability) {
        addIssue(errors, pointer(offerPath, "availability"), "Offer availability is required when offers are present.");
      }
    });
  }
}

function validateArticle(node, path, warnings, errors) {
  if (!node.headline) {
    addIssue(errors, pointer(path, "headline"), "Article requires a headline.");
  }

  if (!node.datePublished) {
    addIssue(errors, pointer(path, "datePublished"), "Article requires datePublished.");
  }

  if (!node.author) {
    addIssue(warnings, pointer(path, "author"), "Article should include an author.");
  }
}

function validateFaqPage(node, path, errors) {
  const entities = node.mainEntity;
  if (!Array.isArray(entities) || entities.length === 0) {
    addIssue(errors, pointer(path, "mainEntity"), "FAQPage requires mainEntity as a non-empty array.");
    return;
  }

  entities.forEach((entry, index) => {
    const entryPath = pointer(pointer(path, "mainEntity"), index);
    if (!isObject(entry)) {
      addIssue(errors, entryPath, "FAQPage mainEntity entries must be Question objects.");
      return;
    }

    if (!includesType(entry["@type"], "Question")) {
      addIssue(errors, pointer(entryPath, "@type"), "FAQPage mainEntity entries must be Question type.");
    }

    const acceptedAnswer = entry.acceptedAnswer;
    if (!isObject(acceptedAnswer) || !includesType(acceptedAnswer["@type"], "Answer")) {
      addIssue(
        errors,
        pointer(entryPath, "acceptedAnswer"),
        "Question entries must include acceptedAnswer with @type Answer.",
      );
    }
  });
}

function validateOrganization(node, path, warnings, errors) {
  if (!node.name) {
    addIssue(errors, pointer(path, "name"), "Organization requires a name.");
  }

  if (!node.url) {
    addIssue(warnings, pointer(path, "url"), "Organization should include a URL.");
  }

  if (!node.logo) {
    addIssue(warnings, pointer(path, "logo"), "Organization should include a logo.");
  }
}

function validateNode(node, path, warnings, errors) {
  if (!isObject(node)) {
    addIssue(errors, path, "Each schema item must be a JSON object.");
    return;
  }

  if (!node["@context"]) {
    addIssue(errors, pointer(path, "@context"), "@context is required.");
  }

  if (!node["@type"]) {
    addIssue(errors, pointer(path, "@type"), "@type is required.");
    return;
  }

  const typeValue = node["@type"];
  if (includesType(typeValue, "Product")) {
    validateProduct(node, path, warnings, errors);
  }

  if (includesType(typeValue, "Article")) {
    validateArticle(node, path, warnings, errors);
  }

  if (includesType(typeValue, "FAQPage")) {
    validateFaqPage(node, path, errors);
  }

  if (includesType(typeValue, "Organization")) {
    validateOrganization(node, path, warnings, errors);
  }
}

export function validateSchemaJsonLd(schemaJsonLd) {
  const errors = [];
  const warnings = [];

  let parsed;
  if (typeof schemaJsonLd === "string") {
    try {
      parsed = JSON.parse(schemaJsonLd);
    } catch {
      addIssue(errors, ROOT_PATH, "schemaJsonLd must be valid JSON.");
      return { errors, warnings, parsed: null, canExportHtmlSnippet: false, highlightInvalidJson: true };
    }
  } else {
    parsed = schemaJsonLd;
  }

  if (!isObject(parsed) && !Array.isArray(parsed)) {
    addIssue(errors, ROOT_PATH, "schemaJsonLd must be a JSON object or array.");
    return { errors, warnings, parsed: null, canExportHtmlSnippet: false, highlightInvalidJson: true };
  }

  const nodes = asArray(parsed);
  nodes.forEach((node, index) => {
    const path = Array.isArray(parsed) ? `/${index}` : ROOT_PATH;
    validateNode(node, path, warnings, errors);
  });

  return {
    errors,
    warnings,
    parsed,
    canExportHtmlSnippet: errors.length === 0,
    highlightInvalidJson: errors.some((issue) => issue.path === ROOT_PATH),
  };
}

export function getSchemaUiState(schemaJsonLd) {
  const result = validateSchemaJsonLd(schemaJsonLd);
  return {
    ...result,
    isSchemaJsonLdInvalid: result.highlightInvalidJson,
    exportDisabled: !result.canExportHtmlSnippet,
  };
}
