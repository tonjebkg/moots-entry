'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, Upload, Check, Database, FileSpreadsheet } from 'lucide-react';

type ImportSource = 'airtable' | 'notion';
type Step = 'connect' | 'select' | 'map' | 'import';

interface FieldMapping {
  source_field: string;
  target_field: string;
}

const TARGET_FIELDS = [
  { value: 'full_name', label: 'Full Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: 'Skip (ignore)' },
];

interface WorkspaceImportWizardProps {
  workspaceId: string;
  source: ImportSource;
  onComplete: (result: { imported: number; skipped: number }) => void;
  onCancel: () => void;
}

export function WorkspaceImportWizard({ workspaceId, source, onComplete, onCancel }: WorkspaceImportWizardProps) {
  const [step, setStep] = useState<Step>('connect');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Airtable state
  const [bases, setBases] = useState<any[]>([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');

  // Notion state
  const [databases, setDatabases] = useState<any[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  // Mapping state
  const [fieldMapping, setFieldMapping] = useState<FieldMapping[]>([]);
  const [tags, setTags] = useState('');

  // Result
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const isAirtable = source === 'airtable';
  const sourceName = isAirtable ? 'Airtable' : 'Notion';

  async function handleConnect() {
    try {
      setLoading(true);
      setError(null);

      if (isAirtable) {
        const res = await fetch(`/api/workspaces/${workspaceId}/import/airtable?api_key=${encodeURIComponent(apiKey)}`);
        if (!res.ok) throw new Error('Failed to connect to Airtable');
        const data = await res.json();
        setBases(data.bases || []);
      } else {
        const res = await fetch(`/api/workspaces/${workspaceId}/import/notion?api_key=${encodeURIComponent(apiKey)}`);
        if (!res.ok) throw new Error('Failed to connect to Notion');
        const data = await res.json();
        setDatabases(data.databases || []);
      }

      setStep('select');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    try {
      setLoading(true);
      setError(null);

      const endpoint = isAirtable
        ? `/api/workspaces/${workspaceId}/import/airtable/preview`
        : `/api/workspaces/${workspaceId}/import/notion/preview`;

      const body = isAirtable
        ? { api_key: apiKey, base_id: selectedBase, table_id: selectedTable }
        : { api_key: apiKey, database_id: selectedDatabase };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to preview data');

      const data = await res.json();
      setFieldMapping(data.suggested_mapping || []);
      setStep('map');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    try {
      setLoading(true);
      setError(null);

      const endpoint = isAirtable
        ? `/api/workspaces/${workspaceId}/import/airtable`
        : `/api/workspaces/${workspaceId}/import/notion`;

      const body = isAirtable
        ? { api_key: apiKey, base_id: selectedBase, table_id: selectedTable, field_mapping: fieldMapping, tags: tags ? tags.split(',').map(t => t.trim()) : [] }
        : { api_key: apiKey, database_id: selectedDatabase, field_mapping: fieldMapping, tags: tags ? tags.split(',').map(t => t.trim()) : [] };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Import failed');

      const data = await res.json();
      setResult(data);
      setStep('import');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateMapping(index: number, targetField: string) {
    const updated = [...fieldMapping];
    updated[index] = { ...updated[index], target_field: targetField };
    setFieldMapping(updated);
  }

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-[#e1e4e8]">
        <div className="flex items-center gap-3 mb-2">
          {isAirtable ? <FileSpreadsheet size={20} className="text-[#0f3460]" /> : <Database size={20} className="text-[#0f3460]" />}
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Import from {sourceName}</h2>
        </div>
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mt-3">
          {(['connect', 'select', 'map', 'import'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-[#0f3460] text-white' :
                ['connect', 'select', 'map', 'import'].indexOf(step) > i ? 'bg-emerald-500 text-white' :
                'bg-[#f0f2f5] text-[#6e6e7e]'
              }`}>
                {['connect', 'select', 'map', 'import'].indexOf(step) > i ? <Check size={12} /> : i + 1}
              </div>
              {i < 3 && <div className="w-8 h-px bg-[#e1e4e8]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                {sourceName} API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${sourceName} API key`}
                className="w-full px-4 py-2.5 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3460] focus:border-transparent"
              />
              <p className="text-xs text-[#6e6e7e] mt-1">
                {isAirtable
                  ? 'Find your API key at airtable.com/account'
                  : 'Create an integration at notion.so/my-integrations'}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="px-4 py-2 text-sm text-[#6e6e7e] hover:text-[#1a1a2e]">Cancel</button>
              <button
                onClick={handleConnect}
                disabled={!apiKey || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect'}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select source */}
        {step === 'select' && (
          <div className="space-y-4">
            {isAirtable ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Base</label>
                  <select
                    value={selectedBase}
                    onChange={(e) => { setSelectedBase(e.target.value); setSelectedTable(''); }}
                    className="w-full px-4 py-2.5 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                  >
                    <option value="">Select a base...</option>
                    {bases.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                {selectedBase && (
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Table</label>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                    >
                      <option value="">Select a table...</option>
                      {bases.find((b: any) => b.id === selectedBase)?.tables?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Database</label>
                <select
                  value={selectedDatabase}
                  onChange={(e) => setSelectedDatabase(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                >
                  <option value="">Select a database...</option>
                  {databases.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep('connect')} className="flex items-center gap-1 px-4 py-2 text-sm text-[#6e6e7e] hover:text-[#1a1a2e]">
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || (isAirtable ? !selectedTable : !selectedDatabase)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Preview & Map Fields'}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Field mapping */}
        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-[#4a4a5e]">Map each source field to a Moots contact field, or skip it.</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {fieldMapping.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_24px_1fr] gap-2 items-center">
                  <div className="px-3 py-2 text-sm bg-[#f8f9fa] border border-[#e1e4e8] rounded-md text-[#1a1a2e]">
                    {m.source_field}
                  </div>
                  <span className="text-center text-[#6e6e7e]">&rarr;</span>
                  <select
                    value={m.target_field}
                    onChange={(e) => updateMapping(i, e.target.value)}
                    className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
                  >
                    {TARGET_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Additional Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., airtable-import, q1-leads"
                className="w-full px-4 py-2 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
              />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep('select')} className="flex items-center gap-1 px-4 py-2 text-sm text-[#6e6e7e] hover:text-[#1a1a2e]">
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import Contacts'}
                <Upload size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'import' && result && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">Import Complete</h3>
            <p className="text-sm text-[#4a4a5e] mb-4">
              <strong>{result.imported}</strong> contacts imported, <strong>{result.skipped}</strong> duplicates skipped
            </p>
            <button
              onClick={() => onComplete(result)}
              className="px-6 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
