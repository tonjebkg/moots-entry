'use client';

import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

interface FieldMapping {
  moots_field: string;
  crm_field: string;
}

interface FieldMappingEditorProps {
  contactFields: FieldMapping[];
  followUpFields: FieldMapping[];
  provider: string;
  onSave: (contactFields: FieldMapping[], followUpFields: FieldMapping[]) => void;
  saving?: boolean;
}

const MOOTS_CONTACT_FIELDS = [
  'first_name', 'last_name', 'full_name', 'email', 'company',
  'title', 'phone', 'linkedin_url', 'industry', 'role_seniority', 'tags',
];

const MOOTS_FOLLOW_UP_FIELDS = [
  'subject', 'content', 'status', 'sent_at',
];

export function FieldMappingEditor({
  contactFields: initialContactFields,
  followUpFields: initialFollowUpFields,
  provider,
  onSave,
  saving,
}: FieldMappingEditorProps) {
  const [contactFields, setContactFields] = useState<FieldMapping[]>(initialContactFields);
  const [followUpFields, setFollowUpFields] = useState<FieldMapping[]>(initialFollowUpFields);

  function addContactField() {
    setContactFields([...contactFields, { moots_field: '', crm_field: '' }]);
  }

  function addFollowUpField() {
    setFollowUpFields([...followUpFields, { moots_field: '', crm_field: '' }]);
  }

  function updateContactField(index: number, key: 'moots_field' | 'crm_field', value: string) {
    const updated = [...contactFields];
    updated[index] = { ...updated[index], [key]: value };
    setContactFields(updated);
  }

  function updateFollowUpField(index: number, key: 'moots_field' | 'crm_field', value: string) {
    const updated = [...followUpFields];
    updated[index] = { ...updated[index], [key]: value };
    setFollowUpFields(updated);
  }

  function removeContactField(index: number) {
    setContactFields(contactFields.filter((_, i) => i !== index));
  }

  function removeFollowUpField(index: number) {
    setFollowUpFields(followUpFields.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      {/* Contact Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[#1a1a2e]">Contact Field Mapping</h4>
          <button
            onClick={addContactField}
            className="flex items-center gap-1 text-xs font-semibold text-[#0f3460] hover:underline"
          >
            <Plus size={12} /> Add Field
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_16px_1fr_32px] gap-2 text-xs font-semibold text-[#6e6e7e] uppercase">
            <span>Moots Field</span>
            <span />
            <span>{provider} Field</span>
            <span />
          </div>
          {contactFields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_16px_1fr_32px] gap-2 items-center">
              <select
                value={field.moots_field}
                onChange={(e) => updateContactField(i, 'moots_field', e.target.value)}
                className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
              >
                <option value="">Select...</option>
                {MOOTS_CONTACT_FIELDS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <span className="text-center text-[#6e6e7e]">&rarr;</span>
              <input
                type="text"
                value={field.crm_field}
                onChange={(e) => updateContactField(i, 'crm_field', e.target.value)}
                placeholder={`${provider} field name`}
                className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
              />
              <button
                onClick={() => removeContactField(i)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-Up Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-[#1a1a2e]">Follow-Up Field Mapping</h4>
          <button
            onClick={addFollowUpField}
            className="flex items-center gap-1 text-xs font-semibold text-[#0f3460] hover:underline"
          >
            <Plus size={12} /> Add Field
          </button>
        </div>

        <div className="space-y-2">
          {followUpFields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_16px_1fr_32px] gap-2 items-center">
              <select
                value={field.moots_field}
                onChange={(e) => updateFollowUpField(i, 'moots_field', e.target.value)}
                className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
              >
                <option value="">Select...</option>
                {MOOTS_FOLLOW_UP_FIELDS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <span className="text-center text-[#6e6e7e]">&rarr;</span>
              <input
                type="text"
                value={field.crm_field}
                onChange={(e) => updateFollowUpField(i, 'crm_field', e.target.value)}
                placeholder={`${provider} field name`}
                className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
              />
              <button
                onClick={() => removeFollowUpField(i)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => onSave(contactFields, followUpFields)}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] transition-colors disabled:opacity-50"
      >
        <Save size={14} />
        {saving ? 'Saving...' : 'Save Mapping'}
      </button>
    </div>
  );
}
