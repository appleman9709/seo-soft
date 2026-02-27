function sanitize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function generateDeterministicMetaAndSchema(input) {
  const titleSource = sanitize(input?.title || input?.topic || 'Untitled Page');
  const descriptionSource = sanitize(input?.description || input?.summary || 'No description provided');
  const slugBase = sanitize(input?.slug || titleSource).replace(/\s+/g, '-');

  const title = toTitleCase(titleSource) || 'Untitled Page';
  const description = descriptionSource || 'No description provided';
  const slug = slugBase || 'untitled-page';

  return {
    meta: {
      title,
      description,
      canonicalUrl: `https://example.com/${slug}`,
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: `https://example.com/${slug}`,
    },
  };
}

module.exports = {
  generateDeterministicMetaAndSchema,
};
