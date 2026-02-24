import { logger } from '@/lib/logger';
import type { CrmProviderInterface, CrmContactPayload, CrmSyncResult } from './provider';

/**
 * HubSpot REST API provider (push-only).
 * Uses HubSpot API v3 for Contacts and Engagements.
 */
export const hubspotProvider: CrmProviderInterface = {
  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const { access_token } = credentials;
    if (!access_token) return false;

    try {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      return res.ok;
    } catch (error) {
      logger.error('HubSpot connection test failed', error as Error);
      return false;
    }
  },

  async pushContact(credentials: Record<string, unknown>, data: CrmContactPayload): Promise<CrmSyncResult> {
    const { access_token } = credentials;
    if (!access_token) {
      return { success: false, error: 'Missing HubSpot access token' };
    }

    try {
      const email = data.email;

      // Search for existing contact by email
      let existingId: string | null = null;
      if (email) {
        const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              }],
            }],
          }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results?.length > 0) {
            existingId = searchData.results[0].id;
          }
        }
      }

      if (existingId) {
        // Update existing contact
        const res = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties: data }),
          }
        );

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, error: `HubSpot update failed: ${errBody}` };
        }

        return { success: true, crm_record_id: existingId };
      } else {
        // Create new contact
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: data }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, error: `HubSpot create failed: ${errBody}` };
        }

        const result = await res.json();
        return { success: true, crm_record_id: result.id };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async pushActivity(credentials: Record<string, unknown>, contactCrmId: string, data: CrmContactPayload): Promise<CrmSyncResult> {
    const { access_token } = credentials;
    if (!access_token) {
      return { success: false, error: 'Missing HubSpot access token' };
    }

    try {
      // Create an email engagement
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            hs_email_subject: data.subject || 'Moots Follow-up',
            hs_email_text: data.content || '',
            hs_email_direction: 'EMAIL',
            hs_email_status: 'SENT',
            hs_timestamp: new Date().toISOString(),
          },
          associations: [{
            to: { id: contactCrmId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 198 }],
          }],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        return { success: false, error: `HubSpot email create failed: ${errBody}` };
      }

      const result = await res.json();
      return { success: true, crm_record_id: result.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

/** Default HubSpot field mapping */
export const HUBSPOT_DEFAULT_MAPPING = {
  contact_fields: [
    { moots_field: 'first_name', crm_field: 'firstname' },
    { moots_field: 'last_name', crm_field: 'lastname' },
    { moots_field: 'email', crm_field: 'email' },
    { moots_field: 'company', crm_field: 'company' },
    { moots_field: 'title', crm_field: 'jobtitle' },
    { moots_field: 'phone', crm_field: 'phone' },
    { moots_field: 'industry', crm_field: 'industry' },
  ],
  follow_up_fields: [
    { moots_field: 'subject', crm_field: 'hs_email_subject' },
    { moots_field: 'content', crm_field: 'hs_email_text' },
  ],
};
