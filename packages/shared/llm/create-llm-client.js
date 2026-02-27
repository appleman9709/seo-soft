const { isLlmEnabled } = require('./config');
const { MockLlmClient } = require('./mock-llm-client');

function createLlmClient(env = process.env) {
  if (isLlmEnabled(env)) {
    // Placeholder behavior until a production LLM adapter is wired.
    return new MockLlmClient();
  }

  return new MockLlmClient();
}

module.exports = {
  createLlmClient,
};
