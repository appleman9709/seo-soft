const { generateDeterministicMetaAndSchema } = require('./deterministic-generator');

class MockLlmClient {
  async generateMetaAndSchema(input) {
    return generateDeterministicMetaAndSchema(input);
  }
}

module.exports = {
  MockLlmClient,
};
