import { describe, it, expect, vi } from 'vitest';

const mockDb = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/db', () => ({
  getDb: () => {
    const handler: ProxyHandler<typeof mockDb> = {
      apply: (_target, _thisArg, args) => mockDb(...args),
    };
    return new Proxy(mockDb, handler);
  },
}));

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { mapContactToCrm, mapFollowUpToCrm } from '../provider';

describe('mapContactToCrm', () => {
  it('maps a Moots contact to CRM fields using field mapping', () => {
    const contact = {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      company: 'Acme',
      title: 'CEO',
    };

    const fieldMapping = {
      contact_fields: [
        { moots_field: 'full_name', crm_field: 'Name' },
        { moots_field: 'email', crm_field: 'Email' },
        { moots_field: 'company', crm_field: 'Company' },
        { moots_field: 'title', crm_field: 'Title' },
      ],
    };

    const mapped = mapContactToCrm(contact, fieldMapping as any);
    expect(mapped).toEqual({
      Name: 'Jane Doe',
      Email: 'jane@example.com',
      Company: 'Acme',
      Title: 'CEO',
    });
  });

  it('skips null/undefined fields', () => {
    const contact = {
      full_name: 'Bob',
      email: null,
    };

    const fieldMapping = {
      contact_fields: [
        { moots_field: 'full_name', crm_field: 'Name' },
        { moots_field: 'email', crm_field: 'Email' },
      ],
    };

    const mapped = mapContactToCrm(contact, fieldMapping as any);
    expect(mapped).toEqual({ Name: 'Bob' });
    expect(mapped).not.toHaveProperty('Email');
  });
});

describe('mapFollowUpToCrm', () => {
  it('maps a follow-up record to CRM activity fields', () => {
    const followUp = {
      subject: 'Post-event follow up',
      content: 'Thanks for attending!',
      status: 'SENT',
      sent_at: '2024-01-15T10:00:00Z',
    };

    const fieldMapping = {
      contact_fields: [],
      follow_up_fields: [
        { moots_field: 'subject', crm_field: 'Subject' },
        { moots_field: 'status', crm_field: 'Status' },
      ],
    };

    const mapped = mapFollowUpToCrm(followUp, fieldMapping as any);
    expect(mapped).toEqual({
      Subject: 'Post-event follow up',
      Status: 'SENT',
    });
  });

  it('handles missing follow_up_fields gracefully', () => {
    const fieldMapping = { contact_fields: [] };
    const mapped = mapFollowUpToCrm({ subject: 'test' }, fieldMapping as any);
    expect(mapped).toEqual({});
  });
});
