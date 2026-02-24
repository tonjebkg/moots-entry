'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, FileSpreadsheet, Database, Link2 } from 'lucide-react';
import { CrmConnectionCard } from '@/app/components/CrmConnectionCard';
import { FieldMappingEditor } from '@/app/components/FieldMappingEditor';
import { WorkspaceImportWizard } from '@/app/components/WorkspaceImportWizard';

interface CrmConnection {
  id: string;
  provider: string;
  name: string;
  sync_direction: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_at: string;
  created_by_name?: string;
}

type ImportSource = 'airtable' | 'notion';

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<CrmConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // CRM add form
  const [showAddCrm, setShowAddCrm] = useState(false);
  const [newCrmProvider, setNewCrmProvider] = useState<'SALESFORCE' | 'HUBSPOT'>('SALESFORCE');
  const [newCrmName, setNewCrmName] = useState('');
  const [newCrmToken, setNewCrmToken] = useState('');
  const [newCrmInstanceUrl, setNewCrmInstanceUrl] = useState('');
  const [addingCrm, setAddingCrm] = useState(false);

  // Field mapping editor
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [mappingData, setMappingData] = useState<any>(null);
  const [savingMapping, setSavingMapping] = useState(false);

  // Import wizard
  const [importSource, setImportSource] = useState<ImportSource | null>(null);

  // Fetch workspace ID from session
  const fetchWorkspaceId = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setWorkspaceId(data.workspace?.id || null);
        return data.workspace?.id;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const fetchConnections = useCallback(async (wsId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${wsId}/crm`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceId().then(wsId => {
      if (wsId) fetchConnections(wsId);
      else setLoading(false);
    });
  }, [fetchWorkspaceId, fetchConnections]);

  async function handleAddCrm() {
    if (!workspaceId) return;
    try {
      setAddingCrm(true);
      setError(null);

      const credentials: any = { access_token: newCrmToken };
      if (newCrmProvider === 'SALESFORCE' && newCrmInstanceUrl) {
        credentials.instance_url = newCrmInstanceUrl;
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/crm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newCrmProvider,
          name: newCrmName || `${newCrmProvider} Connection`,
          credentials,
          sync_direction: 'PUSH',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add connection');
      }

      setShowAddCrm(false);
      setNewCrmName('');
      setNewCrmToken('');
      setNewCrmInstanceUrl('');
      await fetchConnections(workspaceId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingCrm(false);
    }
  }

  async function handleSync(connectionId: string) {
    if (!workspaceId) return;
    try {
      setSyncing(connectionId);
      const res = await fetch(`/api/workspaces/${workspaceId}/crm/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'contacts' }),
      });
      if (!res.ok) throw new Error('Sync failed');
      await fetchConnections(workspaceId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  }

  async function handleDelete(connectionId: string) {
    if (!workspaceId || !confirm('Remove this CRM connection?')) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/crm/${connectionId}`, { method: 'DELETE' });
      await fetchConnections(workspaceId);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleFieldMapping(connectionId: string) {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/crm/${connectionId}/field-mapping`);
      if (res.ok) {
        const data = await res.json();
        setMappingData(data);
        setEditingMapping(connectionId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSaveMapping(contactFields: any[], followUpFields: any[]) {
    if (!workspaceId || !editingMapping) return;
    try {
      setSavingMapping(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/crm/${editingMapping}/field-mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_fields: contactFields, follow_up_fields: followUpFields }),
      });
      if (!res.ok) throw new Error('Failed to save mapping');
      setEditingMapping(null);
      setMappingData(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingMapping(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight mb-2">Integrations</h1>
        <p className="text-sm text-[#4a4a5e]">Connect your CRM and import contacts from external tools</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-800 font-medium">×</button>
        </div>
      )}

      {/* CRM Connections */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">CRM Connections</h2>
            <p className="text-xs text-[#6e6e7e] mt-1">Push contacts and follow-up data to your CRM</p>
          </div>
          <button
            onClick={() => setShowAddCrm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] transition-colors"
          >
            <Plus size={14} />
            Add Connection
          </button>
        </div>

        {/* Add CRM form */}
        {showAddCrm && (
          <div className="bg-white border border-[#e1e4e8] rounded-lg p-5 mb-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-[#1a1a2e]">New CRM Connection</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Provider</label>
                <select
                  value={newCrmProvider}
                  onChange={(e) => setNewCrmProvider(e.target.value as 'SALESFORCE' | 'HUBSPOT')}
                  className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-md"
                >
                  <option value="SALESFORCE">Salesforce</option>
                  <option value="HUBSPOT">HubSpot</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Connection Name</label>
                <input
                  type="text"
                  value={newCrmName}
                  onChange={(e) => setNewCrmName(e.target.value)}
                  placeholder="e.g., Production Salesforce"
                  className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Access Token</label>
              <input
                type="password"
                value={newCrmToken}
                onChange={(e) => setNewCrmToken(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-md"
              />
            </div>
            {newCrmProvider === 'SALESFORCE' && (
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Instance URL</label>
                <input
                  type="url"
                  value={newCrmInstanceUrl}
                  onChange={(e) => setNewCrmInstanceUrl(e.target.value)}
                  placeholder="https://yourorg.my.salesforce.com"
                  className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-md"
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddCrm(false)} className="px-4 py-2 text-sm text-[#6e6e7e]">Cancel</button>
              <button
                onClick={handleAddCrm}
                disabled={!newCrmToken || addingCrm}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] disabled:opacity-50"
              >
                {addingCrm ? 'Adding...' : 'Add Connection'}
              </button>
            </div>
          </div>
        )}

        {/* Connection cards */}
        {connections.length === 0 && !showAddCrm ? (
          <div className="bg-white border border-[#e1e4e8] rounded-lg p-8 text-center">
            <Link2 size={28} className="mx-auto mb-3 text-[#6e6e7e] opacity-50" />
            <p className="text-sm text-[#6e6e7e]">No CRM connections yet. Add one to start syncing contacts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map(conn => (
              <CrmConnectionCard
                key={conn.id}
                connection={conn}
                workspaceId={workspaceId || ''}
                onSync={handleSync}
                onDelete={handleDelete}
                onFieldMapping={handleFieldMapping}
                syncing={syncing === conn.id}
              />
            ))}
          </div>
        )}

        {/* Field mapping editor modal */}
        {editingMapping && mappingData && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">
                Edit Field Mapping — {mappingData.provider}
              </h3>
              <FieldMappingEditor
                contactFields={mappingData.field_mapping?.contact_fields || []}
                followUpFields={mappingData.field_mapping?.follow_up_fields || []}
                provider={mappingData.provider}
                onSave={handleSaveMapping}
                saving={savingMapping}
              />
              <button
                onClick={() => { setEditingMapping(null); setMappingData(null); }}
                className="mt-4 text-sm text-[#6e6e7e] hover:text-[#1a1a2e]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Import Tools */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Import Contacts</h2>
          <p className="text-xs text-[#6e6e7e] mt-1">Import contacts from Airtable or Notion databases</p>
        </div>

        {importSource ? (
          <WorkspaceImportWizard
            workspaceId={workspaceId || ''}
            source={importSource}
            onComplete={() => setImportSource(null)}
            onCancel={() => setImportSource(null)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setImportSource('airtable')}
              className="bg-white border border-[#e1e4e8] rounded-lg p-6 text-left hover:border-[#0f3460] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-yellow-600" />
                </div>
                <h3 className="font-semibold text-[#1a1a2e] group-hover:text-[#0f3460] transition-colors">Airtable</h3>
              </div>
              <p className="text-sm text-[#6e6e7e]">Import contacts from an Airtable base with automatic field detection</p>
            </button>

            <button
              onClick={() => setImportSource('notion')}
              className="bg-white border border-[#e1e4e8] rounded-lg p-6 text-left hover:border-[#0f3460] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Database size={20} className="text-gray-700" />
                </div>
                <h3 className="font-semibold text-[#1a1a2e] group-hover:text-[#0f3460] transition-colors">Notion</h3>
              </div>
              <p className="text-sm text-[#6e6e7e]">Import contacts from a Notion database with field mapping</p>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
