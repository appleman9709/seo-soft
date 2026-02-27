/**
 * @typedef {Object} GenerationResult
 * @property {string} id
 * @property {string} rowId
 * @property {number} version
 * @property {Object} jsonLd
 * @property {string} createdBy
 * @property {string} createdAt
 */

/**
 * Creates a new GenerationResult version after a manual JSON-LD edit.
 * @param {GenerationResult} previousResult
 * @param {string} rawJsonLd
 * @param {string} createdBy
 * @returns {GenerationResult}
 */
function createManualEditVersion(previousResult, rawJsonLd, createdBy) {
  const parsed = JSON.parse(rawJsonLd);

  return {
    ...previousResult,
    id: `${previousResult.rowId}:v${previousResult.version + 1}`,
    version: previousResult.version + 1,
    jsonLd: parsed,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  createManualEditVersion,
};
