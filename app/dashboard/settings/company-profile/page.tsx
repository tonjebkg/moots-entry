'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building, Search, Plus, Trash2, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface LeadershipEntry {
  name: string;
  title: string;
}

interface CompanyProfileData {
  company_name: string;
  company_website: string | null;
  company_description: string | null;
  industry: string | null;
  market_position: string | null;
  key_leadership: LeadershipEntry[];
  strategic_priorities: string[];
  competitors: string[];
  brand_voice: string | null;
  company_enriched_at: string | null;
}

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [marketPosition, setMarketPosition] = useState('');
  const [leadership, setLeadership] = useState<LeadershipEntry[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [brandVoice, setBrandVoice] = useState('');
  const [enrichedAt, setEnrichedAt] = useState<string | null>(null);

  const fetchProfile = useCallback(async (wsId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/company-profile`);
      if (!res.ok) throw new Error('Failed to load');
      const data: CompanyProfileData = await res.json();

      setCompanyName(data.company_name || '');
      setWebsite(data.company_website || '');
      setDescription(data.company_description || '');
      setIndustry(data.industry || '');
      setMarketPosition(data.market_position || '');
      setLeadership(data.key_leadership || []);
      setPriorities(data.strategic_priorities || []);
      setCompetitors(data.competitors || []);
      setBrandVoice(data.brand_voice || '');
      setEnrichedAt(data.company_enriched_at);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get workspace ID from session cookie / API
    fetch('/api/workspaces')
      .then(r => r.json())
      .then(data => {
        const ws = data.workspaces?.[0];
        if (ws) {
          setWorkspaceId(ws.id);
          fetchProfile(ws.id);
        } else {
          setLoading(false);
          setError('No workspace found');
        }
      })
      .catch(() => {
        setLoading(false);
        setError('Failed to load workspace');
      });
  }, [fetchProfile]);

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/company-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_website: website || null,
          company_description: description || null,
          industry: industry || null,
          market_position: marketPosition || null,
          key_leadership: leadership.filter(l => l.name.trim()),
          strategic_priorities: priorities.filter(p => p.trim()),
          competitors: competitors.filter(c => c.trim()),
          brand_voice: brandVoice || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResearch() {
    if (!workspaceId || !companyName.trim()) return;
    setResearching(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/company-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'research',
          company_name: companyName,
          company_website: website || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start research');
      }

      // Poll for results (the research runs async)
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 20) {
          clearInterval(pollInterval);
          setResearching(false);
          return;
        }

        try {
          const checkRes = await fetch(`/api/workspaces/${workspaceId}/company-profile`);
          if (checkRes.ok) {
            const data: CompanyProfileData = await checkRes.json();
            if (data.company_enriched_at && data.company_enriched_at !== enrichedAt) {
              clearInterval(pollInterval);
              setDescription(data.company_description || '');
              setIndustry(data.industry || '');
              setMarketPosition(data.market_position || '');
              setLeadership(data.key_leadership || []);
              setPriorities(data.strategic_priorities || []);
              setCompetitors(data.competitors || []);
              setBrandVoice(data.brand_voice || '');
              setEnrichedAt(data.company_enriched_at);
              setResearching(false);
            }
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setResearching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-ui-tertiary" />
      </div>
    );
  }

  const inputClass =
    'w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta';
  const labelClass = 'block text-sm font-semibold text-brand-charcoal mb-1';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-charcoal flex items-center gap-2">
          <Building size={24} className="text-brand-terracotta" />
          Company Profile
        </h1>
        <p className="text-sm text-ui-tertiary mt-1">
          This context helps the AI personalize scoring, briefings, and communications for your events.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Company Identity */}
      <section className="bg-white rounded-card border border-ui-border p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-charcoal">Company Identity</h2>

        <div>
          <label className={labelClass}>Company Website</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={inputClass}
            placeholder="https://yourcompany.com"
          />
        </div>

        <div>
          <label className={labelClass}>Industry</label>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={inputClass}
            placeholder="e.g., Private Equity, Enterprise SaaS"
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass + ' resize-none'}
            rows={3}
            placeholder="Brief overview of your company..."
          />
        </div>

        {/* Research button */}
        <div className="pt-2">
          <button
            onClick={handleResearch}
            disabled={researching || !companyName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-pill transition-colors disabled:opacity-50"
          >
            {researching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search size={16} />
                Research My Company
              </>
            )}
          </button>
          <p className="text-xs text-ui-tertiary mt-1.5">
            Uses AI to populate fields based on publicly available information. Review results before saving.
          </p>
        </div>
      </section>

      {/* Market Position */}
      <section className="bg-white rounded-card border border-ui-border p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-charcoal">Market Position</h2>
        <textarea
          value={marketPosition}
          onChange={(e) => setMarketPosition(e.target.value)}
          className={inputClass + ' resize-none'}
          rows={3}
          placeholder="Your competitive position and market reputation..."
        />
      </section>

      {/* Key Leadership */}
      <section className="bg-white rounded-card border border-ui-border p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-charcoal">Key Leadership</h2>
        <div className="space-y-2">
          {leadership.map((leader, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={leader.name}
                onChange={(e) => {
                  const next = [...leadership];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setLeadership(next);
                }}
                className={inputClass}
                placeholder="Full Name"
              />
              <input
                value={leader.title}
                onChange={(e) => {
                  const next = [...leadership];
                  next[idx] = { ...next[idx], title: e.target.value };
                  setLeadership(next);
                }}
                className={inputClass}
                placeholder="Title"
              />
              <button
                onClick={() => setLeadership(leadership.filter((_, i) => i !== idx))}
                className="p-2 text-ui-tertiary hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setLeadership([...leadership, { name: '', title: '' }])}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
        >
          <Plus size={14} />
          Add Leader
        </button>
      </section>

      {/* Strategic Priorities */}
      <section className="bg-white rounded-card border border-ui-border p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-charcoal">Strategic Priorities</h2>
        <div className="space-y-2">
          {priorities.map((priority, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={priority}
                onChange={(e) => {
                  const next = [...priorities];
                  next[idx] = e.target.value;
                  setPriorities(next);
                }}
                className={inputClass}
                placeholder="e.g., Expand into healthcare sector"
              />
              <button
                onClick={() => setPriorities(priorities.filter((_, i) => i !== idx))}
                className="p-2 text-ui-tertiary hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setPriorities([...priorities, ''])}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
        >
          <Plus size={14} />
          Add Priority
        </button>
      </section>

      {/* Competitors */}
      <section className="bg-white rounded-card border border-ui-border p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-charcoal">Competitors</h2>
        <div className="space-y-2">
          {competitors.map((competitor, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={competitor}
                onChange={(e) => {
                  const next = [...competitors];
                  next[idx] = e.target.value;
                  setCompetitors(next);
                }}
                className={inputClass}
                placeholder="e.g., Acme Corp"
              />
              <button
                onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))}
                className="p-2 text-ui-tertiary hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setCompetitors([...competitors, ''])}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
        >
          <Plus size={14} />
          Add Competitor
        </button>
      </section>

      {/* Brand Voice */}
      <section className="bg-white rounded-card border border-ui-border p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-charcoal">Brand Voice</h2>
        <textarea
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          className={inputClass + ' resize-none'}
          rows={2}
          placeholder="e.g., Professional and authoritative with emphasis on thought leadership..."
        />
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill shadow-cta transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Company Profile
            </>
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <CheckCircle size={16} />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
