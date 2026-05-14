'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface OllamaInstance {
  id: number;
  name: string;
  base_url: string;
  description: string | null;
  is_active: number;
  last_health_check: string | null;
  health_status: 'online' | 'offline' | 'unknown';
  model_count?: number;
}

interface AvailableModel {
  id: number;
  instance_id: number;
  model_tag: string;
  display_name: string | null;
  parameter_size: string | null;
  quantization: string | null;
  is_available: number;
  instance_name?: string;
}

interface AgentRole {
  id: number;
  role_key: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  is_active: number;
  sort_order: number;
  assignment?: RoleAssignment;
  parameters?: RoleParameters;
  activePrompt?: SystemPrompt;
}

interface RoleAssignment {
  id: number;
  role_id: number;
  model_id: number;
  priority: number;
  is_active: number;
  model_tag?: string;
  model_display_name?: string;
  instance_name?: string;
}

interface RoleParameters {
  id: number;
  role_id: number;
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  num_ctx: number;
  response_format: string;
  keep_alive: string;
  max_tokens: number | null;
}

interface SystemPrompt {
  id: number;
  role_id: number;
  prompt_text: string;
  version: number;
  is_active: number;
  notes: string | null;
}

interface AppSetting {
  key: string;
  value: string;
  description: string | null;
}

// Default seed roles
const SEED_ROLES = ['dm', 'narrator', 'combat', 'npc', 'state', 'character'];

export default function AIAdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'instances' | 'roles' | 'settings'>('instances');
  
  // Data state
  const [instances, setInstances] = useState<OllamaInstance[]>([]);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Instance modal
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<OllamaInstance | null>(null);
  const [instanceForm, setInstanceForm] = useState({ name: '', base_url: '', description: '' });
  
  // Expanded role
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [rolePrompts, setRolePrompts] = useState<Map<number, SystemPrompt[]>>(new Map());
  
  // Test modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingRole, setTestingRole] = useState<string>('');
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meRes] = await Promise.all([
        fetch('/api/auth/me'),
      ]);
      
      const meData = await meRes.json();
      
      if (!meData.user || meData.user.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(meData.user);
      setMounted(true);
      
      await Promise.all([
        loadInstances(),
        loadRoles(),
        loadAppSettings(),
      ]);
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  const loadInstances = async () => {
    try {
      const res = await fetch('/api/admin/instances');
      const data = await res.json();
      setInstances(data.instances || []);
      
      // Also load models
      const modelsRes = await fetch('/api/admin/models');
      const modelsData = await modelsRes.json();
      setModels(modelsData.models || []);
    } catch (e) {
      console.error('Error loading instances:', e);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (e) {
      console.error('Error loading roles:', e);
    }
  };

  const loadAppSettings = async () => {
    try {
      const res = await fetch('/api/admin/app-settings');
      const data = await res.json();
      setAppSettings(data.settings || []);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const loadPromptsForRole = async (roleId: number) => {
    try {
      const res = await fetch(`/api/admin/prompts/${roleId}`);
      const data = await res.json();
      const promptsMap = new Map(rolePrompts);
      promptsMap.set(roleId, data.prompts || []);
      setRolePrompts(promptsMap);
    } catch (e) {
      console.error('Error loading prompts:', e);
    }
  };

  // Instance handlers
  const handleSaveInstance = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (editingInstance?.id) {
        const res = await fetch(`/api/admin/instances/${editingInstance.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(instanceForm),
        });
        if (!res.ok) throw new Error('Failed to update instance');
        setSuccess('Instance updated');
      } else {
        const res = await fetch('/api/admin/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(instanceForm),
        });
        if (!res.ok) throw new Error('Failed to create instance');
        setSuccess('Instance created, discovering models...');
      }
      
      await loadInstances();
      setShowInstanceModal(false);
      setEditingInstance(null);
      setInstanceForm({ name: '', base_url: '', description: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInstance = async (id: number) => {
    if (!confirm('Delete this instance? This will also remove all model assignments.')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/instances/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await loadInstances();
      setSuccess('Instance deleted');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/instances/${id}/discover`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setSuccess(`Discovered ${data.discovered} models`);
      await loadInstances();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/instances/${id}/health`, { method: 'POST' });
      const data = await res.json();
      await loadInstances();
      setSuccess(`Health: ${data.status}`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Role handlers
  const handleToggleRoleActive = async (role: AgentRole) => {
    try {
      await fetch(`/api/admin/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: role.is_active ? 0 : 1 }),
      });
      await loadRoles();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSaveParams = async (roleId: number, params: RoleParameters) => {
    try {
      await fetch(`/api/admin/parameters/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      await loadRoles();
      setSuccess('Parameters saved');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAssignModel = async (roleId: number, modelId: number, priority: number = 1) => {
    try {
      await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId, model_id: modelId, priority }),
      });
      await loadRoles();
      setSuccess('Model assigned');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSavePrompt = async (roleId: number, promptText: string, notes?: string) => {
    try {
      await fetch(`/api/admin/prompts/${roleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_text: promptText, notes }),
      });
      await loadPromptsForRole(roleId);
      await loadRoles();
      setSuccess('Prompt saved');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleActivatePrompt = async (roleId: number, promptId: number) => {
    try {
      await fetch(`/api/admin/prompts/${roleId}/activate/${promptId}`, {
        method: 'PUT',
      });
      await loadPromptsForRole(roleId);
      await loadRoles();
      setSuccess('Prompt activated');
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Test handlers
  const handleTestAgent = async () => {
    if (!testPrompt.trim()) return;
    
    setTesting(true);
    setTestResult('');
    setError('');
    
    try {
      const res = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleKey: testingRole, testPrompt: testPrompt }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Test failed');
        return;
      }
      
      setTestResult(data.content || '(empty response)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  };

  // Settings handlers
  const handleSaveSetting = async (key: string, value: string) => {
    try {
      await fetch(`/api/admin/app-settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      await loadAppSettings();
      setSuccess('Setting saved');
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Get available models for dropdown
  const availableModelsList = models.filter(m => m.is_available);

  // Helper to get health dot color
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  if (!mounted) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">AI Configuration</h1>
            <p className="text-gray-400 mt-1">Manage Ollama instances and agent configurations</p>
          </div>
          <a href="/admin" className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
            ← Back to Admin
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('instances')}
            className={`px-4 py-2 rounded-t ${activeTab === 'instances' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Ollama Instances
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-t ${activeTab === 'roles' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Agent Roles
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-t ${activeTab === 'settings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Global Settings
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-white">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-200">
            {success}
            <button onClick={() => setSuccess('')} className="ml-2 text-green-400 hover:text-white">×</button>
          </div>
        )}

        {/* Instances Tab */}
        {activeTab === 'instances' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Ollama Instances</h2>
              <button
                onClick={() => { setEditingInstance(null); setInstanceForm({ name: '', base_url: '', description: '' }); setShowInstanceModal(true); }}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
              >
                + Add Instance
              </button>
            </div>

            {instances.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-800/50 rounded">
                No Ollama instances configured. Add one to get started.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {instances.map(instance => (
                  <div key={instance.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getHealthColor(instance.health_status)}`} />
                        <div>
                          <h3 className="font-semibold">{instance.name}</h3>
                          <p className="text-sm text-gray-400">{instance.base_url}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDiscover(instance.id)}
                          disabled={loading}
                          className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                        >
                          Refresh
                        </button>
                        <button
                          onClick={() => handleHealthCheck(instance.id)}
                          className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                        >
                          Health
                        </button>
                        <button
                          onClick={() => {
                            setEditingInstance(instance);
                            setInstanceForm({ name: instance.name, base_url: instance.base_url, description: instance.description || '' });
                            setShowInstanceModal(true);
                          }}
                          className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteInstance(instance.id)}
                          className="px-2 py-1 text-xs bg-red-900 rounded hover:bg-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {instance.description && (
                      <p className="mt-2 text-sm text-gray-400">{instance.description}</p>
                    )}
                    <div className="mt-3 flex gap-4 text-sm text-gray-400">
                      <span>{instance.model_count || 0} models</span>
                      <span>Status: {instance.health_status}</span>
                      {instance.last_health_check && (
                        <span>Last check: {new Date(instance.last_health_check).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Agent Roles</h2>
            
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="bg-gray-800 rounded-lg border border-gray-700">
                  {/* Role Header */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-750"
                    onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{role.icon || '🎯'}</span>
                      <div>
                        <h3 className="font-semibold">{role.display_name}</h3>
                        <p className="text-sm text-gray-400">{role.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs ${role.is_active ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleRoleActive(role); }}
                        className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
                      >
                        {role.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setTestingRole(role.role_key); 
                          setTestPrompt(''); 
                          setTestResult(''); 
                          setShowTestModal(true); 
                        }}
                        className="px-2 py-1 text-xs bg-blue-700 rounded hover:bg-blue-600"
                      >
                        Test
                      </button>
                      <span className="text-gray-400">{expandedRole === role.id ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedRole === role.id && (
                    <div className="p-4 pt-0 border-t border-gray-700 mt-2 space-y-4">
                      {/* Model Assignment */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Model Assignment</h4>
                        <div className="flex gap-2 flex-wrap">
                          {role.assignment ? (
                            <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded">
                              <span>{role.assignment.model_tag} ({role.assignment.instance_name})</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No model assigned</span>
                          )}
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleAssignModel(role.id, parseInt(e.target.value));
                            }}
                            className="bg-gray-700 px-3 py-2 rounded"
                            value=""
                          >
                            <option value="">Assign Model...</option>
                            {availableModelsList.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.model_tag} ({m.instance_name})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Parameters */}
                      {role.parameters && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-2">Generation Parameters</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ParameterInput 
                              label="Temperature" 
                              value={role.parameters.temperature} 
                              min={0} max={2} step={0.1}
                              onChange={(v) => handleSaveParams(role.id, { ...role.parameters!, temperature: v })}
                            />
                            <ParameterInput 
                              label="Top P" 
                              value={role.parameters.top_p} 
                              min={0} max={1} step={0.05}
                              onChange={(v) => handleSaveParams(role.id, { ...role.parameters!, top_p: v })}
                            />
                            <ParameterInput 
                              label="Top K" 
                              value={role.parameters.top_k} 
                              min={1} max={100} step={1}
                              onChange={(v) => handleSaveParams(role.id, { ...role.parameters!, top_k: v })}
                              isInt
                            />
                            <ParameterInput 
                              label="Context (ctx)" 
                              value={role.parameters.num_ctx} 
                              min={512} max={32768} step={512}
                              onChange={(v) => handleSaveParams(role.id, { ...role.parameters!, num_ctx: v })}
                              isInt
                            />
                            <ParameterInput 
                              label="Repeat Penalty" 
                              value={role.parameters.repeat_penalty} 
                              min={0} max={2} step={0.1}
                              onChange={(v) => handleSaveParams(role.id, { ...role.parameters!, repeat_penalty: v })}
                            />
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Response Format</label>
                              <select
                                value={role.parameters.response_format}
                                onChange={(e) => handleSaveParams(role.id, { ...role.parameters!, response_format: e.target.value })}
                                className="w-full bg-gray-700 px-2 py-1 rounded"
                              >
                                <option value="text">Text</option>
                                <option value="json">JSON</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Keep Alive</label>
                              <input
                                type="text"
                                value={role.parameters.keep_alive || '10m'}
                                onChange={(e) => handleSaveParams(role.id, { ...role.parameters!, keep_alive: e.target.value })}
                                className="w-full bg-gray-700 px-2 py-1 rounded"
                              />
                            </div>
                            <ParameterInput 
                              label="Max Tokens" 
                              value={role.parameters.max_tokens || 0} 
                              min={0} max={4096} step={64}
                              onChange={(v) => handleSaveParams(role.id, { ...role.parameters!, max_tokens: v })}
                              isInt
                              allowZero
                            />
                          </div>
                        </div>
                      )}

                      {/* System Prompt */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">System Prompt</h4>
                        {role.activePrompt ? (
                          <div className="space-y-2">
                            <textarea
                              defaultValue={role.activePrompt.prompt_text}
                              onBlur={(e) => {
                                if (e.target.value !== role.activePrompt?.prompt_text) {
                                  handleSavePrompt(role.id, e.target.value);
                                }
                              }}
                              className="w-full h-48 bg-gray-700 px-3 py-2 rounded font-mono text-sm"
                            />
                            <div className="flex gap-2 text-sm text-gray-400">
                              <span>Version: {role.activePrompt.version}</span>
                              {role.activePrompt.notes && <span>Note: {role.activePrompt.notes}</span>}
                            </div>
                            <button
                              onClick={() => {
                                const notes = prompt('Enter notes for new version:');
                                if (notes !== null) {
                                  const textarea = document.querySelector(`textarea[onBlur]`) as HTMLTextAreaElement;
                                  handleSavePrompt(role.id, textarea?.value || role.activePrompt!.prompt_text, notes);
                                }
                              }}
                              className="text-sm text-blue-400 hover:text-blue-300"
                            >
                              + Save New Version
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-400">No system prompt configured</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Global Settings</h2>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
              {appSettings.map(setting => (
                <div key={setting.key} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold">{setting.key}</label>
                    {setting.description && (
                      <p className="text-xs text-gray-400">{setting.description}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={setting.value}
                    onBlur={(e) => {
                      if (e.target.value !== setting.value) {
                        handleSaveSetting(setting.key, e.target.value);
                      }
                    }}
                    className="w-32 bg-gray-700 px-3 py-2 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instance Modal */}
        {showInstanceModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">
                {editingInstance?.id ? 'Edit Instance' : 'Add Instance'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={instanceForm.name}
                    onChange={(e) => setInstanceForm({ ...instanceForm, name: e.target.value })}
                    placeholder="e.g., port-ai"
                    className="w-full bg-gray-700 px-3 py-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Base URL</label>
                  <input
                    type="text"
                    value={instanceForm.base_url}
                    onChange={(e) => setInstanceForm({ ...instanceForm, base_url: e.target.value })}
                    placeholder="http://192.168.1.100:11434"
                    className="w-full bg-gray-700 px-3 py-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={instanceForm.description}
                    onChange={(e) => setInstanceForm({ ...instanceForm, description: e.target.value })}
                    placeholder="e.g., RTX 5070 Ti - 16GB VRAM"
                    className="w-full bg-gray-700 px-3 py-2 rounded"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSaveInstance}
                  disabled={loading || !instanceForm.name || !instanceForm.base_url}
                  className="flex-1 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setShowInstanceModal(false); setEditingInstance(null); }}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
              <h3 className="text-xl font-semibold mb-4">
                Test {roles.find(r => r.role_key === testingRole)?.display_name || testingRole}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Test Prompt</label>
                  <textarea
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Enter a test prompt..."
                    className="w-full h-32 bg-gray-700 px-3 py-2 rounded"
                  />
                </div>
                
                <button
                  onClick={handleTestAgent}
                  disabled={testing || !testPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Run Test'}
                </button>

                {testResult && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Response</label>
                    <div className="w-full h-48 bg-gray-900 px-3 py-2 rounded overflow-auto font-mono text-sm whitespace-pre-wrap">
                      {testResult}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => { setShowTestModal(false); setTestResult(''); }}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for parameter input
function ParameterInput({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  onChange,
  isInt = false,
  allowZero = false
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (v: number) => void;
  isInt?: boolean;
  allowZero?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    let newValue = isInt ? parseInt(localValue) : parseFloat(localValue);
    if (isNaN(newValue)) newValue = value;
    newValue = Math.max(min, Math.min(max, newValue));
    if (!allowZero && newValue === 0) newValue = value;
    setLocalValue(newValue.toString());
    onChange(newValue);
  };

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        className="w-full bg-gray-700 px-2 py-1 rounded"
      />
    </div>
  );
}