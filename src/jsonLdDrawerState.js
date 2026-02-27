const { createManualEditVersion } = require('./generationResult');

/**
 * State machine for editing JSON-LD within a single row's drawer.
 */
class JsonLdDrawerState {
  /**
   * @param {Object} initialResult
   */
  constructor(initialResult) {
    this.result = initialResult;
    this.isEditMode = false;
    this.error = null;
    this.draftJson = JSON.stringify(initialResult.jsonLd, null, 2);
  }

  toggleEditJsonLd() {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      this.draftJson = JSON.stringify(this.result.jsonLd, null, 2);
    }
    this.error = null;
  }

  setDraftJson(value) {
    this.draftJson = value;
  }

  /**
   * @param {string} createdBy
   * @returns {boolean}
   */
  save(createdBy) {
    try {
      const nextResult = createManualEditVersion(this.result, this.draftJson, createdBy);
      this.result = nextResult;
      this.error = null;
      this.isEditMode = false;
      return true;
    } catch (_error) {
      this.error = 'Invalid JSON. Please fix formatting before saving.';
      return false;
    }
  }
}

module.exports = {
  JsonLdDrawerState,
};
