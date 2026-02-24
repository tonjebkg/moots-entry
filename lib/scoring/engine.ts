import { getAnthropicClient } from '@/lib/anthropic';
import { getDb } from '@/lib/db';

interface ContactForScoring {
  id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  industry: string | null;
  role_seniority: string | null;
  ai_summary: string | null;
  tags: string[];
  enrichment_data: Record<string, unknown>;
}

interface ObjectiveForScoring {
  id: string;
  objective_text: string;
  weight: number;
}

interface ScoringResult {
  relevance_score: number;
  matched_objectives: {
    objective_id: string;
    objective_text: string;
    match_score: number;
    explanation: string;
  }[];
  score_rationale: string;
  talking_points: string[];
}

/**
 * Score a single contact against event objectives using Claude.
 */
export async function scoreContactForEvent(
  contact: ContactForScoring,
  objectives: ObjectiveForScoring[],
  eventTitle: string
): Promise<ScoringResult> {
  const client = getAnthropicClient();

  const prompt = buildScoringPrompt(contact, objectives, eventTitle);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  return parseScoringResponse(text, objectives);
}

function buildScoringPrompt(
  contact: ContactForScoring,
  objectives: ObjectiveForScoring[],
  eventTitle: string
): string {
  const lines = [
    `Score this contact's relevance to the event "${eventTitle}".`,
    '',
    '## Contact Profile',
    `Name: ${contact.full_name}`,
  ];

  if (contact.company) lines.push(`Company: ${contact.company}`);
  if (contact.title) lines.push(`Title: ${contact.title}`);
  if (contact.industry) lines.push(`Industry: ${contact.industry}`);
  if (contact.role_seniority) lines.push(`Seniority: ${contact.role_seniority}`);
  if (contact.ai_summary) lines.push(`Summary: ${contact.ai_summary}`);
  if (contact.tags.length > 0) lines.push(`Tags: ${contact.tags.join(', ')}`);

  lines.push('');
  lines.push('## Event Objectives (weighted)');
  for (const obj of objectives) {
    lines.push(`- [Weight ${obj.weight}] ${obj.objective_text}`);
  }

  lines.push('');
  lines.push('Respond in this exact JSON format (no markdown, just raw JSON):');
  lines.push(JSON.stringify({
    relevance_score: 'number 0-100',
    matched_objectives: [
      {
        objective_index: 0,
        match_score: 'number 0-100',
        explanation: 'Why this contact matches/doesn\'t match this objective',
      },
    ],
    score_rationale: '2-3 sentence overall assessment',
    talking_points: ['Point 1', 'Point 2', 'Point 3'],
  }));

  lines.push('');
  lines.push('Score guidelines: 80-100 = strong match, 60-79 = good match, 40-59 = moderate, 20-39 = weak, 0-19 = poor match.');
  lines.push('If you lack information about the contact, score conservatively (30-50) and note the data gap in rationale.');

  return lines.join('\n');
}

function parseScoringResponse(
  text: string,
  objectives: ObjectiveForScoring[]
): ScoringResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultScoringResult(objectives);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const matchedObjectives = (parsed.matched_objectives || []).map((mo: any, i: number) => {
      const objIndex = mo.objective_index ?? i;
      const obj = objectives[objIndex] || objectives[0];
      return {
        objective_id: obj?.id || '',
        objective_text: obj?.objective_text || '',
        match_score: Math.min(100, Math.max(0, Math.round(Number(mo.match_score) || 0))),
        explanation: mo.explanation || '',
      };
    });

    return {
      relevance_score: Math.min(100, Math.max(0, Math.round(Number(parsed.relevance_score) || 50))),
      matched_objectives: matchedObjectives,
      score_rationale: parsed.score_rationale || '',
      talking_points: Array.isArray(parsed.talking_points) ? parsed.talking_points.slice(0, 5) : [],
    };
  } catch {
    return defaultScoringResult(objectives);
  }
}

function defaultScoringResult(objectives: ObjectiveForScoring[]): ScoringResult {
  return {
    relevance_score: 50,
    matched_objectives: objectives.map(o => ({
      objective_id: o.id,
      objective_text: o.objective_text,
      match_score: 50,
      explanation: 'Insufficient data for accurate scoring',
    })),
    score_rationale: 'Could not generate detailed scoring due to parsing error. Manual review recommended.',
    talking_points: [],
  };
}

/**
 * Save a scoring result to the database.
 */
export async function saveScoringResult(
  contactId: string,
  eventId: number,
  workspaceId: string,
  result: ScoringResult
): Promise<void> {
  const db = getDb();
  const matchedJson = JSON.stringify(result.matched_objectives);
  const talkingJson = JSON.stringify(result.talking_points);

  await db`
    INSERT INTO guest_scores (
      contact_id, event_id, workspace_id,
      relevance_score, matched_objectives, score_rationale, talking_points,
      scored_at, model_version
    ) VALUES (
      ${contactId}, ${eventId}, ${workspaceId},
      ${result.relevance_score},
      ${matchedJson}::jsonb,
      ${result.score_rationale},
      ${talkingJson}::jsonb,
      NOW(),
      'claude-sonnet-4-20250514'
    )
    ON CONFLICT (contact_id, event_id) DO UPDATE SET
      relevance_score = ${result.relevance_score},
      matched_objectives = ${matchedJson}::jsonb,
      score_rationale = ${result.score_rationale},
      talking_points = ${talkingJson}::jsonb,
      scored_at = NOW(),
      model_version = 'claude-sonnet-4-20250514'
  `;
}
