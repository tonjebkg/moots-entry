import { getAnthropicClient } from '@/lib/anthropic';
import type { EnrichmentProvider, EnrichmentInput, EnrichmentResult } from './types';

/**
 * Claude-based enrichment provider.
 * Synthesizes a professional profile summary using Claude's knowledge.
 * No paid data APIs required — enrichment quality improves with future provider integrations.
 */
export class AiSearchProvider implements EnrichmentProvider {
  name = 'ai-claude';

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    try {
      const client = getAnthropicClient();

      const prompt = this.buildPrompt(input);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('');

      // Parse structured response
      const parsed = this.parseResponse(text);

      return {
        success: true,
        provider: this.name,
        ...parsed,
        cost_cents: 0, // Claude API cost tracked separately
      };
    } catch (error: any) {
      return {
        success: false,
        provider: this.name,
        error: error.message || 'Enrichment failed',
      };
    }
  }

  private buildPrompt(input: EnrichmentInput): string {
    const parts = [`Analyze this professional contact and provide enrichment data.`];
    parts.push(`Name: ${input.full_name}`);
    if (input.emails.length > 0) parts.push(`Email: ${input.emails[0].email}`);
    if (input.company) parts.push(`Company: ${input.company}`);
    if (input.title) parts.push(`Title: ${input.title}`);
    if (input.linkedin_url) parts.push(`LinkedIn: ${input.linkedin_url}`);

    parts.push('');
    parts.push('Respond in this exact JSON format (no markdown, just raw JSON):');
    parts.push(JSON.stringify({
      ai_summary: 'A 2-3 sentence professional summary of this person',
      industry: 'Their industry',
      role_seniority: 'C-Suite | VP | Director | Manager | IC | Founder | Investor | Board Member | Other',
      company_info: 'Brief about their company',
      notable_facts: ['Fact 1', 'Fact 2'],
    }));
    parts.push('');
    parts.push('If you cannot find reliable information for a field, use null. Only include information you are reasonably confident about. Do not fabricate details.');

    return parts.join('\n');
  }

  private parseResponse(text: string): Partial<EnrichmentResult> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { ai_summary: text.trim() };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        ai_summary: parsed.ai_summary || null,
        industry: parsed.industry || null,
        role_seniority: parsed.role_seniority || null,
        raw_data: parsed,
      };
    } catch {
      return { ai_summary: text.trim() };
    }
  }
}
