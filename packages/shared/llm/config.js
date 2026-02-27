function isLlmEnabled(env = process.env) {
  return String(env.USE_LLM || 'false').toLowerCase() === 'true';
}

module.exports = {
  isLlmEnabled,
};
