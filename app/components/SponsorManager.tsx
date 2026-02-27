'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Save, Loader2, X, Users, Target } from 'lucide-react';

interface Sponsor {
  id: string;
  name: string;
  tier: string | null;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  contact_person: string | null;
  contact_email: string | null;
  goals: string[];
  promised_seats: number | null;
  table_preference: string | null;
  key_attendees: { name: string; title?: string }[];
  notes: string | null;
}

interface SponsorManagerProps {
  eventId: string;
}

const TIER_OPTIONS = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'PARTNER'];
const TIER_COLORS: Record<string, string> = {
  PLATINUM: 'bg-slate-200 text-slate-800',
  GOLD: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-gray-200 text-gray-700',
  BRONZE: 'bg-orange-100 text-orange-800',
  PARTNER: 'bg-blue-100 text-blue-800',
};

export function SponsorManager({ eventId }: SponsorManagerProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newGoals, setNewGoals] = useState<string[]>(['']);
  const [newPromisedSeats, setNewPromisedSeats] = useState('');
  const [newKeyAttendees, setNewKeyAttendees] = useState<{ name: string; title: string }[]>([]);

  const fetchSponsors = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors`);
      if (res.ok) {
        const data = await res.json();
        setSponsors(data.sponsors || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  function resetAddForm() {
    setNewName('');
    setNewTier('');
    setNewDescription('');
    setNewContactPerson('');
    setNewContactEmail('');
    setNewGoals(['']);
    setNewPromisedSeats('');
    setNewKeyAttendees([]);
    setShowAddForm(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/events/${eventId}/sponsors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          tier: newTier || null,
          description: newDescription || null,
          contact_person: newContactPerson || null,
          contact_email: newContactEmail || null,
          goals: newGoals.filter(g => g.trim()),
          promised_seats: newPromisedSeats ? parseInt(newPromisedSeats) : null,
          key_attendees: newKeyAttendees.filter(a => a.name.trim()),
        }),
      });

      if (res.ok) {
        resetAddForm();
        fetchSponsors();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sponsorId: string) {
    const res = await fetch(`/api/events/${eventId}/sponsors/${sponsorId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setSponsors(sponsors.filter(s => s.id !== sponsorId));
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-ui-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-brand-charcoal">Sponsors</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 border border-brand-terracotta/30 rounded-lg hover:bg-brand-terracotta/5 transition-colors"
        >
          <Plus size={14} />
          Add Sponsor
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-card border border-ui-border p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-brand-charcoal">New Sponsor</span>
            <button onClick={resetAddForm} className="p-1 text-ui-tertiary hover:text-brand-charcoal">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} placeholder="Sponsor name *" />
            <select value={newTier} onChange={(e) => setNewTier(e.target.value)} className={inputClass}>
              <option value="">Select tier...</option>
              {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={inputClass + ' resize-none'} rows={2} placeholder="Description..." />

          <div className="grid grid-cols-2 gap-3">
            <input value={newContactPerson} onChange={(e) => setNewContactPerson(e.target.value)} className={inputClass} placeholder="Contact person" />
            <input value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} className={inputClass} placeholder="Contact email" />
          </div>

          <input value={newPromisedSeats} onChange={(e) => setNewPromisedSeats(e.target.value)} className={inputClass} placeholder="Promised seats (number)" type="number" min="0" />

          {/* Goals */}
          <div>
            <label className="block text-xs font-semibold text-ui-tertiary mb-1">Goals</label>
            {newGoals.map((goal, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <input
                  value={goal}
                  onChange={(e) => { const g = [...newGoals]; g[idx] = e.target.value; setNewGoals(g); }}
                  className={inputClass}
                  placeholder="e.g., Meet 3 portfolio CEOs"
                />
                {newGoals.length > 1 && (
                  <button onClick={() => setNewGoals(newGoals.filter((_, i) => i !== idx))} className="p-1 text-ui-tertiary hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setNewGoals([...newGoals, ''])} className="text-xs text-brand-terracotta hover:underline mt-1">+ Add goal</button>
          </div>

          {/* Key Attendees */}
          <div>
            <label className="block text-xs font-semibold text-ui-tertiary mb-1">Key Attendees</label>
            {newKeyAttendees.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <input
                  value={att.name}
                  onChange={(e) => { const a = [...newKeyAttendees]; a[idx] = { ...a[idx], name: e.target.value }; setNewKeyAttendees(a); }}
                  className={inputClass}
                  placeholder="Name"
                />
                <input
                  value={att.title}
                  onChange={(e) => { const a = [...newKeyAttendees]; a[idx] = { ...a[idx], title: e.target.value }; setNewKeyAttendees(a); }}
                  className={inputClass}
                  placeholder="Title"
                />
                <button onClick={() => setNewKeyAttendees(newKeyAttendees.filter((_, i) => i !== idx))} className="p-1 text-ui-tertiary hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => setNewKeyAttendees([...newKeyAttendees, { name: '', title: '' }])} className="text-xs text-brand-terracotta hover:underline mt-1">+ Add attendee</button>
          </div>

          <button
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Sponsor
          </button>
        </div>
      )}

      {/* Sponsor List */}
      {sponsors.length === 0 && !showAddForm && (
        <p className="text-sm text-ui-tertiary py-4 text-center">No sponsors yet. Add one to enrich AI context.</p>
      )}

      {sponsors.map((sponsor) => {
        const isExpanded = expandedId === sponsor.id;
        const tierColor = sponsor.tier ? (TIER_COLORS[sponsor.tier] || 'bg-gray-100 text-gray-700') : '';

        return (
          <div key={sponsor.id} className="bg-white rounded-card border border-ui-border overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : sponsor.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-cream/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-brand-charcoal">{sponsor.name}</span>
                {sponsor.tier && (
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${tierColor}`}>
                    {sponsor.tier}
                  </span>
                )}
                {sponsor.goals && sponsor.goals.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-ui-tertiary">
                    <Target size={12} />
                    {sponsor.goals.length} goal{sponsor.goals.length !== 1 ? 's' : ''}
                  </span>
                )}
                {sponsor.key_attendees && sponsor.key_attendees.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-ui-tertiary">
                    <Users size={12} />
                    {sponsor.key_attendees.length} attendee{sponsor.key_attendees.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-ui-tertiary" /> : <ChevronDown size={16} className="text-ui-tertiary" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-ui-border pt-3 space-y-2 text-sm">
                {sponsor.description && <p className="text-ui-secondary">{sponsor.description}</p>}
                {sponsor.contact_person && <p className="text-ui-tertiary">Contact: {sponsor.contact_person} {sponsor.contact_email ? `(${sponsor.contact_email})` : ''}</p>}
                {sponsor.promised_seats && <p className="text-ui-tertiary">Promised seats: {sponsor.promised_seats}</p>}
                {sponsor.table_preference && <p className="text-ui-tertiary">Table preference: {sponsor.table_preference}</p>}

                {sponsor.goals && sponsor.goals.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-ui-tertiary">Goals:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {sponsor.goals.map((goal, i) => (
                        <span key={i} className="px-2 py-0.5 bg-brand-cream text-xs text-brand-charcoal rounded-full">{goal}</span>
                      ))}
                    </div>
                  </div>
                )}

                {sponsor.key_attendees && sponsor.key_attendees.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-ui-tertiary">Key Attendees:</span>
                    <ul className="mt-1 space-y-0.5">
                      {sponsor.key_attendees.map((att, i) => (
                        <li key={i} className="text-xs text-ui-secondary">{att.name}{att.title ? ` — ${att.title}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sponsor.notes && <p className="text-xs text-ui-tertiary italic">{sponsor.notes}</p>}

                <div className="pt-2">
                  <button
                    onClick={() => handleDelete(sponsor.id)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    <Trash2 size={12} />
                    Remove Sponsor
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
