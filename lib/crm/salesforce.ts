import { logger } from '@/lib/logger';
import type { CrmProviderInterface, CrmContactPayload, CrmSyncResult } from './provider';

/**
 * Salesforce REST API provider (push-only).
 * Uses Salesforce REST API v59.0 for Contact and Task objects.
 */
export const salesforceProvider: CrmProviderInterface = {
  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const { instance_url, access_token } = credentials;
    if (!instance_url || !access_token) return false;

    try {
      const res = await fetch(`${instance_url}/services/data/v59.0/`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      return res.ok;
    } catch (error) {
      logger.error('Salesforce connection test failed', error as Error);
      return false;
    }
  },

  async pushContact(credentials: Record<string, unknown>, data: CrmContactPayload): Promise<CrmSyncResult> {
    const { instance_url, access_token } = credentials;
    if (!instance_url || !access_token) {
      return { success: false, error: 'Missing Salesforce credentials' };
    }

    try {
      // Try to find existing contact by email
      const email = data.Email || data.email;
      let existingId: string | null = null;

      if (email) {
        const searchRes = await fetch(
          `${instance_url}/services/data/v59.0/query/?q=${encodeURIComponent(`SELECT Id FROM Contact WHERE Email = '${email}' LIMIT 1`)}`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.records?.length > 0) {
            existingId = searchData.records[0].Id;
          }
        }
      }

      if (existingId) {
        // Update existing contact
        const res = await fetch(
          `${instance_url}/services/data/v59.0/sobjects/Contact/${existingId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          }
        );

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, error: `Salesforce update failed: ${errBody}` };
        }

        return { success: true, crm_record_id: existingId };
      } else {
        // Create new contact
        const res = await fetch(
          `${instance_url}/services/data/v59.0/sobjects/Contact/`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          }
        );

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, error: `Salesforce create failed: ${errBody}` };
        }

        const result = await res.json();
        return { success: true, crm_record_id: result.id };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async pushActivity(credentials: Record<string, unknown>, contactCrmId: string, data: CrmContactPayload): Promise<CrmSyncResult> {
    const { instance_url, access_token } = credentials;
    if (!instance_url || !access_token) {
      return { success: false, error: 'Missing Salesforce credentials' };
    }

    try {
      const taskData = {
        WhoId: contactCrmId,
        Subject: data.subject || 'Moots Follow-up',
        Description: data.content || '',
        Status: 'Completed',
        Type: 'Email',
        ...data,
      };

      const res = await fetch(
        `${instance_url}/services/data/v59.0/sobjects/Task/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        return { success: false, error: `Salesforce task create failed: ${errBody}` };
      }

      const result = await res.json();
      return { success: true, crm_record_id: result.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};

/** Default Salesforce field mapping */
export const SALESFORCE_DEFAULT_MAPPING = {
  contact_fields: [
    { moots_field: 'first_name', crm_field: 'FirstName' },
    { moots_field: 'last_name', crm_field: 'LastName' },
    { moots_field: 'email', crm_field: 'Email' },
    { moots_field: 'company', crm_field: 'Company' },
    { moots_field: 'title', crm_field: 'Title' },
    { moots_field: 'phone', crm_field: 'Phone' },
    { moots_field: 'industry', crm_field: 'Industry' },
  ],
  follow_up_fields: [
    { moots_field: 'subject', crm_field: 'Subject' },
    { moots_field: 'content', crm_field: 'Description' },
    { moots_field: 'status', crm_field: 'Status' },
  ],
};
