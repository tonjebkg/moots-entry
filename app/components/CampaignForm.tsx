'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface CampaignFormProps {
  eventId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id?: string;
    name: string;
    description?: string;
    email_subject?: string;
    email_body?: string;
  };
}

export function CampaignForm({ eventId, onSuccess, onCancel, initialData }: CampaignFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [emailSubject, setEmailSubject] = useState(initialData?.email_subject || '');
  const [emailBody, setEmailBody] = useState(initialData?.email_body || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = isEditing
        ? `/api/campaigns/${initialData.id}`
        : `/api/events/${eventId}/campaigns`;

      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          email_subject: emailSubject.trim() || undefined,
          email_body: emailBody.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save campaign');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-ui-border">
          <h2 className="text-xl font-semibold text-brand-charcoal tracking-tight">
            {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
          <button
            onClick={onCancel}
            disabled={saving}
            className="text-ui-tertiary hover:text-brand-charcoal transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Campaign Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Black Ambition Dinner - November Wave"
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal notes about this campaign"
                rows={3}
                className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
              />
            </div>

            {/* Email Customization */}
            <div className="border-t border-ui-border pt-4">
              <h3 className="text-base font-semibold text-brand-charcoal mb-2">
                Email Template (Optional)
              </h3>
              <p className="text-sm text-ui-secondary mb-4 leading-relaxed">
                Customize the email template for this campaign. Leave blank to use the default template.
              </p>

              <div className="space-y-4">
                {/* Email Subject */}
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="You're invited to [Event Title]"
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                  />
                </div>

                {/* Email Body */}
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-2">
                    Custom Email Body (HTML)
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Leave blank to use default template"
                    rows={6}
                    className="w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-ui-tertiary mt-1">
                    Advanced: You can use HTML for custom styling
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white rounded-lg transition-colors shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save size={16} />
                    {isEditing ? 'Update Campaign' : 'Create Campaign'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 bg-white border border-ui-border rounded-lg text-ui-secondary hover:bg-brand-cream transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
