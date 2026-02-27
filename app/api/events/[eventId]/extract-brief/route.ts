import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { getAnthropicClient } from '@/lib/anthropic';
import { z } from 'zod';
import { validateRequest } from '@/lib/validate-request';

export const runtime = 'nodejs';

const extractBriefSchema = z.object({
  brief_text: z.string().min(10, 'Brief text must be at least 10 characters').max(10000),
});

type RouteContext = { params: Promise<{ eventId: string }> };

/**
 * POST /api/events/[eventId]/extract-brief
 * AI extracts objectives, theme, stakeholders, success criteria from freeform text.
 * Returns extracted data; does NOT auto-save.
 */
export const POST = withErrorHandling(async (request: NextRequest, _context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, extractBriefSchema);
  if (!validation.success) return validation.error;
  const { brief_text } = validation.data;

  const client = getAnthropicClient();

  const prompt = `Extract structured event planning data from this brief. Return ONLY raw JSON (no markdown).

## Brief Text
${brief_text}

Return this JSON structure:
{
  "objectives": [
    { "objective_text": "Description of ideal guest type or goal", "weight": 1.0 }
  ],
  "event_theme": "Theme or tagline if mentioned (null if not)",
  "success_criteria": "What would make this event successful (null if not mentioned)",
  "key_stakeholders": [
    { "name": "Person Name", "role": "Their role/relevance" }
  ],
  "additional_context": "Any other relevant context extracted from the brief"
}

Guidelines:
- Extract 2-5 objectives from the brief (guest criteria, networking goals, business outcomes)
- Weight objectives from 0.5 (nice-to-have) to 2.0 (critical), default 1.0
- Only include stakeholders if specific people are mentioned
- Keep objectives actionable and specific to guest curation
- If something isn't mentioned in the brief, use null for that field`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      objectives: (parsed.objectives || []).map((o: any, i: number) => ({
        objective_text: o.objective_text || '',
        weight: Math.min(5, Math.max(0.1, Number(o.weight) || 1.0)),
        sort_order: i,
      })),
      event_theme: parsed.event_theme || null,
      success_criteria: parsed.success_criteria || null,
      key_stakeholders: parsed.key_stakeholders || [],
      additional_context: parsed.additional_context || null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to extract structured data from brief' },
      { status: 422 }
    );
  }
});
