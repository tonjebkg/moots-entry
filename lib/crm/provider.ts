import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { CrmFieldMapping, CrmSyncDirection } from '@/types/phase4';

export interface CrmContactPayload {
  [key: string]: string | number | boolean | null;
}

export interface CrmSyncResult {
  success: boolean;
  crm_record_id?: string;
  error?: string;
}

/**
 * Abstract CRM provider interface.
 * Each provider (Salesforce, HubSpot) implements this.
 */
export interface CrmProviderInterface {
  /** Test connection with given credentials */
  testConnection(credentials: Record<string, unknown>): Promise<boolean>;
  /** Push a contact record to the CRM */
  pushContact(credentials: Record<string, unknown>, data: CrmContactPayload): Promise<CrmSyncResult>;
  /** Push a follow-up/activity record to the CRM */
  pushActivity(credentials: Record<string, unknown>, contactCrmId: string, data: CrmContactPayload): Promise<CrmSyncResult>;
}

/**
 * Map a Moots contact to CRM fields using the field mapping config.
 */
export function mapContactToCrm(
  contact: Record<string, any>,
  fieldMapping: CrmFieldMapping
): CrmContactPayload {
  const payload: CrmContactPayload = {};
  for (const mapping of fieldMapping.contact_fields) {
    const value = contact[mapping.moots_field];
    if (value !== undefined && value !== null) {
      payload[mapping.crm_field] = value;
    }
  }
  return payload;
}

/**
 * Map a follow-up record to CRM activity fields.
 */
export function mapFollowUpToCrm(
  followUp: Record<string, any>,
  fieldMapping: CrmFieldMapping
): CrmContactPayload {
  const payload: CrmContactPayload = {};
  for (const mapping of (fieldMapping.follow_up_fields || [])) {
    const value = followUp[mapping.moots_field];
    if (value !== undefined && value !== null) {
      payload[mapping.crm_field] = value;
    }
  }
  return payload;
}

/**
 * Sync a single contact to a CRM connection.
 */
export async function syncContactToCrm(
  connectionId: string,
  workspaceId: string,
  contactId: string,
  provider: CrmProviderInterface,
  credentials: Record<string, unknown>,
  fieldMapping: CrmFieldMapping
): Promise<CrmSyncResult> {
  const db = getDb();

  // Fetch contact data
  const contacts = await db`
    SELECT full_name, first_name, last_name, company, title,
           emails, phone, linkedin_url, industry, role_seniority, tags
    FROM people_contacts
    WHERE id = ${contactId} AND workspace_id = ${workspaceId}
    LIMIT 1
  `;

  if (contacts.length === 0) {
    return { success: false, error: 'Contact not found' };
  }

  const contact = contacts[0];
  // Flatten emails for CRM
  const primaryEmail = Array.isArray(contact.emails) && contact.emails.length > 0
    ? (contact.emails[0] as any)?.address || contact.emails[0]
    : null;

  const flatContact = {
    ...contact,
    email: primaryEmail,
    tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
  };

  const payload = mapContactToCrm(flatContact, fieldMapping);

  // Log sync attempt
  const logId = await db`
    INSERT INTO crm_sync_log (
      connection_id, workspace_id, contact_id,
      entity_type, entity_id, direction, status,
      request_payload
    ) VALUES (
      ${connectionId}, ${workspaceId}, ${contactId},
      'contact', ${contactId}, 'PUSH'::crm_sync_direction, 'PENDING'::crm_sync_status,
      ${JSON.stringify(payload)}::jsonb
    ) RETURNING id
  `;

  try {
    const result = await provider.pushContact(credentials, payload);

    await db`
      UPDATE crm_sync_log SET
        status = ${result.success ? 'SUCCESS' : 'FAILED'}::crm_sync_status,
        crm_record_id = ${result.crm_record_id || null},
        response_payload = ${JSON.stringify(result)}::jsonb,
        error_message = ${result.error || null}
      WHERE id = ${logId[0].id}
    `;

    return result;
  } catch (error: any) {
    await db`
      UPDATE crm_sync_log SET
        status = 'FAILED'::crm_sync_status,
        error_message = ${error.message}
      WHERE id = ${logId[0].id}
    `;

    logger.error('CRM sync failed', error, { connectionId, contactId });
    return { success: false, error: error.message };
  }
}

/**
 * Sync a follow-up record to CRM as an activity.
 */
export async function syncFollowUpToCrm(
  connectionId: string,
  workspaceId: string,
  followUpId: string,
  contactCrmId: string,
  provider: CrmProviderInterface,
  credentials: Record<string, unknown>,
  fieldMapping: CrmFieldMapping
): Promise<CrmSyncResult> {
  const db = getDb();

  const followUps = await db`
    SELECT id, subject, content, status, sent_at, contact_id
    FROM follow_up_sequences
    WHERE id = ${followUpId} AND workspace_id = ${workspaceId}
    LIMIT 1
  `;

  if (followUps.length === 0) {
    return { success: false, error: 'Follow-up not found' };
  }

  const payload = mapFollowUpToCrm(followUps[0], fieldMapping);

  const logId = await db`
    INSERT INTO crm_sync_log (
      connection_id, workspace_id, contact_id,
      entity_type, entity_id, direction, status,
      request_payload
    ) VALUES (
      ${connectionId}, ${workspaceId}, ${followUps[0].contact_id},
      'follow_up', ${followUpId}, 'PUSH'::crm_sync_direction, 'PENDING'::crm_sync_status,
      ${JSON.stringify(payload)}::jsonb
    ) RETURNING id
  `;

  try {
    const result = await provider.pushActivity(credentials, contactCrmId, payload);

    await db`
      UPDATE crm_sync_log SET
        status = ${result.success ? 'SUCCESS' : 'FAILED'}::crm_sync_status,
        crm_record_id = ${result.crm_record_id || null},
        response_payload = ${JSON.stringify(result)}::jsonb,
        error_message = ${result.error || null}
      WHERE id = ${logId[0].id}
    `;

    return result;
  } catch (error: any) {
    await db`
      UPDATE crm_sync_log SET
        status = 'FAILED'::crm_sync_status,
        error_message = ${error.message}
      WHERE id = ${logId[0].id}
    `;

    logger.error('CRM follow-up sync failed', error, { connectionId, followUpId });
    return { success: false, error: error.message };
  }
}
