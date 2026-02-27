import { getSchemaUiState } from "./schemaValidation.js";

export function renderValidationState(schemaJsonLd, elements) {
  const state = getSchemaUiState(schemaJsonLd);

  elements.exportButton.disabled = state.exportDisabled;
  elements.schemaField.classList.toggle("field-error", state.isSchemaJsonLdInvalid);

  elements.errorList.innerHTML = state.errors
    .map((issue) => `<li><strong>${issue.path || '/'}:</strong> ${issue.message}</li>`)
    .join("");

  elements.warningList.innerHTML = state.warnings
    .map((issue) => `<li><strong>${issue.path || '/'}:</strong> ${issue.message}</li>`)
    .join("");

  return state;
}
