import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

/**
 * Get Anthropic client singleton.
 * Follows the same lazy-init pattern as getDb().
 * Throws if ANTHROPIC_API_KEY is not set.
 */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required for AI features');
  }

  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return _client;
}
