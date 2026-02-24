import { getDb } from '@/lib/db';

/**
 * Compute a dedup key from contact data.
 * Uses lowercase email (primary or first) + lowercase full name.
 * Returns null if insufficient data for dedup.
 */
export function computeDedupKey(
  fullName: string,
  emails: { email: string }[]
): string | null {
  const primaryEmail = emails.find(e => (e as any).primary)?.email || emails[0]?.email;
  if (!primaryEmail || !fullName) return null;
  return `${primaryEmail.toLowerCase().trim()}:${fullName.toLowerCase().trim()}`;
}

/**
 * Find existing contacts that match the given dedup key within a workspace.
 */
export async function findDuplicates(
  workspaceId: string,
  dedupKey: string
) {
  const db = getDb();
  return db`
    SELECT id, full_name, emails
    FROM people_contacts
    WHERE workspace_id = ${workspaceId}
      AND dedup_key = ${dedupKey}
  `;
}

/**
 * Find duplicate by email across all contacts in a workspace.
 */
export async function findByEmail(
  workspaceId: string,
  email: string
) {
  const db = getDb();
  const emailLower = email.toLowerCase().trim();
  return db`
    SELECT id, full_name
    FROM people_contacts
    WHERE workspace_id = ${workspaceId}
      AND emails @> ${JSON.stringify([{ email: emailLower }])}::jsonb
  `;
}
