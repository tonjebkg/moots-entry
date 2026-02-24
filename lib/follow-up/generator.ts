import { getAnthropicClient } from '@/lib/anthropic';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const MODEL_VERSION = 'claude-sonnet-4-20250514';

interface FollowUpContent {
  subject: string;
  content: string;
}

/**
 * Generate personalized follow-up email content for a contact.
 */
export async function generateFollowUpContent(
  contactId: string,
  eventId: number,
  workspaceId: string,
  eventTitle: string,
  template?: { subject?: string; content?: string }
): Promise<FollowUpContent> {
  const db = getDb();

  // Get contact + scoring data
  const contacts = await db`
    SELECT pc.full_name, pc.company, pc.title, pc.ai_summary, pc.tags,
      gs.relevance_score, gs.score_rationale, gs.talking_points
    FROM people_contacts pc
    LEFT JOIN guest_scores gs ON gs.contact_id = pc.id AND gs.event_id = ${eventId}
    WHERE pc.id = ${contactId} AND pc.workspace_id = ${workspaceId}
  `;

  if (contacts.length === 0) {
    return {
      subject: template?.subject || `Following up — ${eventTitle}`,
      content: template?.content || `Thank you for attending ${eventTitle}. We hope you enjoyed the event.`,
    };
  }

  const contact = contacts[0];
  const client = getAnthropicClient();

  const prompt = `Generate a personalized follow-up email for a guest who attended an event. Return ONLY raw JSON.

## Event
Title: ${eventTitle}

## Guest
Name: ${contact.full_name}
Company: ${contact.company || 'N/A'}
Title: ${contact.title || 'N/A'}
AI Summary: ${contact.ai_summary || 'N/A'}
Tags: ${(contact.tags || []).join(', ') || 'N/A'}
Relevance Score: ${contact.relevance_score || 'N/A'}
Score Rationale: ${contact.score_rationale || 'N/A'}
Talking Points: ${JSON.stringify(contact.talking_points || [])}

${template?.subject ? `Subject template: ${template.subject}` : ''}
${template?.content ? `Content template: ${template.content}` : ''}

Return JSON:
{
  "subject": "Email subject line (personalized, professional, max 80 chars)",
  "content": "Email body (2-3 paragraphs, reference specific talking points, propose next steps, professional but warm tone)"
}

Keep it concise and actionable. Reference something specific about their profile or the event.`;

  const response = await client.messages.create({
    model: MODEL_VERSION,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      subject: parsed.subject || `Following up — ${eventTitle}`,
      content: parsed.content || `Thank you for attending ${eventTitle}.`,
    };
  } catch {
    logger.error('Failed to parse follow-up response', undefined, { text });
    return {
      subject: `Following up — ${eventTitle}`,
      content: `Hi ${contact.full_name},\n\nThank you for attending ${eventTitle}. It was great connecting with you${contact.company ? ` from ${contact.company}` : ''}. I'd love to continue our conversation.\n\nBest regards`,
    };
  }
}

/**
 * Trigger follow-ups for a set of contacts (or all scored contacts).
 */
export async function triggerFollowUps(
  eventId: number,
  workspaceId: string,
  contactIds?: string[],
  template?: { subject?: string; content?: string },
  autoGenerate: boolean = true
): Promise<{ created: number; skipped: number }> {
  const db = getDb();

  // Get event title
  const events = await db`SELECT title FROM events WHERE id = ${eventId}`;
  const eventTitle = events[0]?.title || `Event #${eventId}`;

  // Determine contacts
  let contacts;
  if (contactIds && contactIds.length > 0) {
    contacts = await db`
      SELECT pc.id, pc.full_name, pc.emails
      FROM people_contacts pc
      WHERE pc.id = ANY(${contactIds})
        AND pc.workspace_id = ${workspaceId}
    `;
  } else {
    // Default: all scored contacts for this event
    contacts = await db`
      SELECT pc.id, pc.full_name, pc.emails
      FROM guest_scores gs
      JOIN people_contacts pc ON pc.id = gs.contact_id
      WHERE gs.event_id = ${eventId} AND gs.workspace_id = ${workspaceId}
      ORDER BY gs.relevance_score DESC
    `;
  }

  let created = 0;
  let skipped = 0;

  for (const contact of contacts) {
    // Check for existing follow-up
    const existing = await db`
      SELECT id FROM follow_up_sequences
      WHERE event_id = ${eventId} AND contact_id = ${contact.id}
    `;

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    let subject: string;
    let content: string;

    if (autoGenerate) {
      const generated = await generateFollowUpContent(
        contact.id, eventId, workspaceId, eventTitle, template
      );
      subject = generated.subject;
      content = generated.content;
    } else {
      subject = template?.subject || `Following up — ${eventTitle}`;
      content = template?.content || `Thank you for attending ${eventTitle}.`;
    }

    const contextJson = JSON.stringify({
      contact_name: contact.full_name,
      event_title: eventTitle,
      auto_generated: autoGenerate,
    });

    await db`
      INSERT INTO follow_up_sequences (
        event_id, workspace_id, contact_id,
        subject, content, personalization_context,
        model_version, generated_at
      ) VALUES (
        ${eventId}, ${workspaceId}, ${contact.id},
        ${subject}, ${content}, ${contextJson}::jsonb,
        ${autoGenerate ? MODEL_VERSION : null},
        ${autoGenerate ? new Date().toISOString() : null}
      )
    `;

    created++;
  }

  return { created, skipped };
}
