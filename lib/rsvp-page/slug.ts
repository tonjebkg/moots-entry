import { getDb } from '@/lib/db';

/**
 * Generate a URL-safe slug from an event title.
 * Appends a random suffix if needed to ensure uniqueness.
 */
export async function generateSlug(eventTitle: string): Promise<string> {
  const base = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const db = getDb();

  // Check if base slug is available
  const existing = await db`
    SELECT id FROM rsvp_pages WHERE slug = ${base}
  `;

  if (existing.length === 0) return base;

  // Append random suffix
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Validate an access code for a private RSVP page.
 */
export function validateAccessCode(
  pageAccessCode: string | null,
  submittedCode: string | undefined
): boolean {
  if (!pageAccessCode) return true; // No code required
  if (!submittedCode) return false;
  return pageAccessCode === submittedCode;
}
