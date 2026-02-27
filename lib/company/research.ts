import { getAnthropicClient } from '@/lib/anthropic';
import { getDb } from '@/lib/db';
import { logAgentActivity } from '@/lib/agent/activity';
import { logger } from '@/lib/logger';

/**
 * Research a company using Claude and populate workspace company profile fields.
 *
 * NOTE: This uses Claude's training data, not live web search.
 * The UI should make this clear to users.
 */
export async function researchCompany(
  workspaceId: string,
  companyName: string,
  companyWebsite?: string
): Promise<void> {
  const client = getAnthropicClient();

  const websiteHint = companyWebsite
    ? `Their website is ${companyWebsite}.`
    : '';

  const prompt = `Research the company "${companyName}". ${websiteHint}

Return ONLY raw JSON (no markdown) with this structure:
{
  "company_description": "2-3 sentence overview of what the company does, its size, and reputation",
  "industry": "Primary industry (e.g., 'Private Equity', 'Enterprise SaaS', 'Healthcare Technology')",
  "market_position": "1-2 sentences on their competitive position and reputation in the market",
  "key_leadership": [
    { "name": "Full Name", "title": "Title" }
  ],
  "strategic_priorities": ["Priority 1", "Priority 2"],
  "competitors": ["Competitor 1", "Competitor 2"],
  "brand_voice": "1 sentence describing their communication style (e.g., 'Professional and authoritative with emphasis on thought leadership')"
}

Guidelines:
- For key_leadership, include up to 5 senior leaders (CEO, President, Managing Partners, etc.)
- For strategic_priorities, include 2-4 current focus areas
- For competitors, include 3-5 direct competitors
- If you're unsure about specific details, note uncertainty in the description rather than guessing
- Be specific and factual based on what you know about this company`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    logger.error('Failed to parse company research response', err as Error, { text });
    return;
  }

  const db = getDb();

  // Update workspace with research results
  const description = (parsed.company_description as string) || null;
  const industry = (parsed.industry as string) || null;
  const marketPosition = (parsed.market_position as string) || null;
  const keyLeadership = JSON.stringify(parsed.key_leadership || []);
  const strategicPriorities = JSON.stringify(parsed.strategic_priorities || []);
  const competitors = JSON.stringify(parsed.competitors || []);
  const brandVoice = (parsed.brand_voice as string) || null;

  await db`
    UPDATE workspaces SET
      company_description = ${description},
      industry = ${industry},
      market_position = ${marketPosition},
      key_leadership = ${keyLeadership}::jsonb,
      strategic_priorities = ${strategicPriorities}::jsonb,
      competitors = ${competitors}::jsonb,
      brand_voice = ${brandVoice},
      company_enriched_at = NOW()
    WHERE id = ${workspaceId}
  `;

  // Log agent activity
  await logAgentActivity({
    workspaceId,
    type: 'observation',
    headline: `Researched company profile for ${companyName}`,
    detail: `Populated industry (${industry}), ${(parsed.key_leadership as unknown[])?.length || 0} leaders, ${(parsed.strategic_priorities as unknown[])?.length || 0} priorities, ${(parsed.competitors as unknown[])?.length || 0} competitors.`,
    metadata: {
      company_name: companyName,
      company_website: companyWebsite,
      fields_populated: Object.keys(parsed).length,
    },
  });
}
