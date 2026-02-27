/**
 * Placeholder OpenAI implementation.
 *
 * TODO:
 * - Wire into createLlmClient when product requirements permit external LLM usage.
 * - Add robust retry policy (e.g. exponential backoff + jitter for 429/5xx).
 * - Add request timeout handling with AbortController.
 * - Add rate limiting/queueing to stay within provider quotas.
 */
class OpenAiLlmClient {
  constructor(options = {}) {
    this.options = {
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      // Safe configuration points:
      timeoutMs: options.timeoutMs || Number(process.env.OPENAI_TIMEOUT_MS || 10000),
      maxRetries: options.maxRetries || Number(process.env.OPENAI_MAX_RETRIES || 2),
      requestsPerMinute:
        options.requestsPerMinute || Number(process.env.OPENAI_REQUESTS_PER_MINUTE || 60),
    };
  }

  async generateMetaAndSchema(_input) {
    throw new Error('OpenAiLlmClient is a placeholder and is not wired yet.');
  }
}

module.exports = {
  OpenAiLlmClient,
};
