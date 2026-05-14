'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_VERSION, APP_BRANCH } from '@/lib/version';

interface Settings {
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_key: string;
  ai_adult_content: string;
  ai_context_window: string;
  ai_keep_loaded: string;
  ai_timeout: string;
  models?: string[];
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

// AI Configuration interfaces
interface OllamaInstance {
  id: number;
  name: string;
  base_url: string;
  description: string | null;
  is_active: number;
  last_health_check: string | null;
  health_status: string;
  created_at: string;
}

interface AvailableModel {
  id: number;
  instance_id: number;
  model_tag: string;
  display_name: string | null;
  parameter_size: string | null;
  quantization: string | null;
  vram_required_mb: number | null;
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
  assignments?: RoleAssignment[];
  assignment?: RoleAssignment;
  activePrompt?: SystemPrompt;
}

interface RoleAssignment {
  id: number;
  role_id: number;
  model_id: number;
  priority: number;
  model_tag?: string;
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
  max_tokens: number;
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

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<Settings>({
    ai_provider: 'ollama',
    ai_base_url: 'http://localhost:11434',
    ai_model: 'llama3',
    ai_api_key: '',
    ai_adult_content: 'false',
    ai_context_window: '4096',
    ai_keep_loaded: '300',
    ai_timeout: '120',
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [checkingLoaded, setCheckingLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'aiConfig' | 'users' | 'tokens' | 'email' | 'updates' | 'portainer'>('aiConfig');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  
  // AI Configuration state (from /admin/ai page)
  const [aiActiveTab, setAiActiveTab] = useState<'instances' | 'roles' | 'settings'>('instances');
  
  // API tokens state
  const [apiTokens, setApiTokens] = useState<{id: number; name: string; expiresAt: string; createdAt: string}[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenDays, setNewTokenDays] = useState(90);
  const [generatedToken, setGeneratedToken] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'gm' | 'admin'>('gm');
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'gm' | 'admin'>('gm');
  const [editPassword, setEditPassword] = useState('');
  
  // Email tab state
  const [testEmail, setTestEmail] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState('');
  const [smtpSaved, setSmtpSaved] = useState(false);
  
  // SMTP settings state
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_tls: true,
  });
  const [testingEmail, setTestingEmail] = useState(false);

  // Updates tab state
  const [versionInfo, setVersionInfo] = useState<{
    currentVersion?: string;
    currentBranch?: string;
    latestCommit?: string;
    lastUpdated?: string;
  }>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [buildInfo, setBuildInfo] = useState<{version: string; build: string; buildHash: string} | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [redeploying, setRedeploying] = useState(false);
  const [redeployStatus, setRedeployStatus] = useState('');
  
  // Portainer branch state
  const [selectedBranch, setSelectedBranch] = useState('dev');
  const [availableBranches, setAvailableBranches] = useState<string[]>(['stable', 'dev']);
  const [portainerAvailable, setPortainerAvailable] = useState(false);
  const [portainerUrl, setPortainerUrl] = useState<string | null>(null);
  const [deployInfo, setDeployInfo] = useState<{
    currentBranch: string;
    pendingBranch?: string;
  } | null>(null);
  const [updatingBranch, setUpdatingBranch] = useState(false);
  const [branchUpdateStatus, setBranchUpdateStatus] = useState('');
  const [portainerStatus, setPortainerStatus] = useState<{ok: boolean; reachable: boolean; apiUrl: string | null; error: string | null; missingEnv: string[] | null; tried: string[] | null} | null>(null);
  const [portainerStack, setPortainerStack] = useState<{ok: boolean; id?: number; name?: string; repoUrl?: string; branch?: string; webhooks?: string[]; error?: string} | null>(null);
  const [portainerBranchInput, setPortainerBranchInput] = useState('');
  const [portainerUrlInput, setPortainerUrlInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Load Portainer branch info when switching to updates/portainer tab
  useEffect(() => {
    if (activeTab === 'updates') {
      loadBranchInfo();
      fetch('/api/version').then(r => r.json()).then(d => setBuildInfo(d)).catch(() => setBuildInfo(null));
    }
    if (activeTab === 'portainer') {
      loadBranchInfo();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [meRes, settingsRes, usersRes, tokensRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/users'),
        fetch('/api/auth/tokens'),
      ]);
      
      const meData = await meRes.json();
      const settingsData = await settingsRes.json();
      const usersData = await usersRes.json();
      const tokensData = await tokensRes.json();
      
      if (!meData.user || meData.user.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(meData.user);
      if (settingsData.ai_provider) {
        setSettings(settingsData);
      }
      // Load SMTP settings
      if (settingsData.smtp_host) {
        setSmtpSettings({
          smtp_host: settingsData.smtp_host || '',
          smtp_port: settingsData.smtp_port || '587',
          smtp_user: settingsData.smtp_user || '',
          smtp_pass: settingsData.smtp_pass || '',
          smtp_from: settingsData.smtp_from || '',
          smtp_tls: settingsData.smtp_tls !== false,
        });
      }
      setUsers(usersData.users || []);
      setApiTokens(tokensData.tokens || []);
      setMounted(true);
    } catch (e) {
      router.push('/');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testEmailSettings = async () => {
    if (!testEmail) {
      setTestEmailStatus('Please enter an email address');
      return;
    }
    setTestEmailStatus('Sending...');
    setError('');

    try {
      // Note: User must save settings first before testing
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailStatus('Test email sent successfully!');
      } else {
        setTestEmailStatus(data.error || 'Failed to send test email');
      }
    } catch (err) {
      setTestEmailStatus(err instanceof Error ? err.message : 'Failed to send test email');
    }
  };

  const checkForUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateStatus('');
    try {
      const res = await fetch('/api/admin/version');
      const data = await res.json();
      if (res.ok) {
        setVersionInfo(data);
        if (data.latestCommit) {
          setUpdateStatus('Ready to deploy. Click Redeploy Stack to update.');
        }
      } else {
        setUpdateStatus(data.error || 'Failed to check for updates');
      }
    } catch (err) {
      setUpdateStatus(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setCheckingUpdates(false);
    }
  };

  const triggerRedeploy = async () => {
    // Deprecated - using new Portainer branch system instead
  };

  // Load branch info on mount
  const loadBranchInfo = async () => {
    try {
      // Load full portainer status
      const statusRes = await fetch('/api/portainer/status');
      const statusData = await statusRes.json();
      setPortainerStatus(statusData);
      setPortainerAvailable(statusData.reachable === true);
      setPortainerUrl(statusData.apiUrl || null);
      
      // Load stack info if reachable
      if (statusData.reachable) {
        const stackRes = await fetch('/api/portainer/stack');
        const stackData = await stackRes.json();
        setPortainerStack(stackData);
      } else {
        setPortainerStack(null);
      }
      
      // Also load branch/deploy info
      const res = await fetch('/api/portainer/branches');
      const data = await res.json();
      
      // Check if Portainer is available (deprecated use statusData.reachable)
      setPortainerAvailable(data.available === true || statusData.reachable === true);
      setPortainerUrl(data.detectedUrl || statusData.apiUrl || null);
      
      if (!data.available && !statusData.reachable) {
        setBranchUpdateStatus(statusData.error || data.error || 'Portainer API not detected');
        return;
      }
      
      if (res.ok) {
        setDeployInfo({
          currentBranch: data.currentBranch || 'stable',
          pendingBranch: data.pendingBranch,
        });
        setAvailableBranches(data.availableBranches || ['stable', 'dev']);
        setBranchUpdateStatus('');
      } else {
        setBranchUpdateStatus(data.error || 'Failed to load branch info');
      }
    } catch (err) {
      console.error('Failed to load branch info:', err);
      setBranchUpdateStatus('Failed to connect to Portainer');
    }
  };

  // Handle branch selection (just stores pending, doesn't update)
  const handleBranchChange = async (branch: string) => {
    setSelectedBranch(branch);
    setBranchUpdateStatus('');
    try {
      const res = await fetch('/api/portainer/set-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update local state to show pending
        setDeployInfo(prev => prev ? { ...prev, pendingBranch: branch } : null);
      } else {
        setBranchUpdateStatus(data.error || 'Failed to set branch');
      }
    } catch (err) {
      setBranchUpdateStatus(err instanceof Error ? err.message : 'Failed to set branch');
    }
  };

  // Handle Update button click
  const updateBranch = async () => {
    setUpdatingBranch(true);
    setBranchUpdateStatus('');
    try {
      const res = await fetch('/api/portainer/update', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setBranchUpdateStatus(data.message || 'Updated successfully!');
        // Refresh branch info
        await loadBranchInfo();
      } else {
        setBranchUpdateStatus(data.error || 'Failed to update');
      }
    } catch (err) {
      setBranchUpdateStatus(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdatingBranch(false);
    }
  };

  const fetchModels = async () => {
    setFetchingModels(true);
    setError('');
    try {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.models) {
        setAvailableModels(data.models);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setFetchingModels(false);
    }
  };

  const checkLoadedModels = async () => {
    setCheckingLoaded(true);
    setError('');
    try {
      // Pass base_url as query parameter
      const url = new URL('/api/admin/models', window.location.href);
      url.searchParams.set('base_url', settings.ai_base_url);
      const res = await fetch(url.toString(), {
        method: 'GET',
      });
      const data = await res.json();
      if (data.loaded_models) {
        setLoadedModels(data.loaded_models);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check loaded models');
    } finally {
      setCheckingLoaded(false);
    }
  };

  const unloadModel = async (modelName: string) => {
    if (!confirm(`Unload ${modelName}?`)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/models', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, ai_base_url: settings.ai_base_url }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${modelName} unloaded`);
        checkLoadedModels();
      } else {
        throw new Error(data.error || 'Failed to unload model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unload model');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection failed');
      }

      alert(`Connection successful! Model: ${data.model}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole, email: newEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/users?id=${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: editUsername, 
          email: editEmail, 
          role: editRole,
          password: editPassword || undefined 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }

      setEditingUser(null);
      setEditPassword('');
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    
    try {
      await fetch(`/api/auth/users?id=${id}`, { method: 'DELETE' });
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const createToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedToken('');
    try {
      const res = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName, daysValid: newTokenDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create token');
      setGeneratedToken(data.token);
      setNewTokenName('');
      // Refresh tokens list
      const tokensRes = await fetch('/api/auth/tokens');
      const tokensData = await tokensRes.json();
      setApiTokens(tokensData.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async (id: number) => {
    if (!confirm('Revoke this token? Any apps using it will lose access.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/tokens?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke token');
      // Refresh tokens list
      const tokensRes = await fetch('/api/auth/tokens');
      const tokensData = await tokensRes.json();
      setApiTokens(tokensData.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">⚙️ Admin</h1>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('aiConfig')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'aiConfig' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🤖 AI Configuration
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'tokens' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🔑 API Tokens
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'email' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            📧 Email
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'updates' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🔄 Updates
          </button>
          <button
            onClick={() => setActiveTab('portainer')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'portainer' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🐳 Portainer
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
          >
            📜 Campaigns
          </button>
        </div>

        {activeTab === 'aiConfig' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">AI Configuration</h2>
            
            {/* Sub-tabs for AI Configuration sections */}
            <div className="flex gap-2 mb-6 border-b border-slate-700 pb-2">
              <button
                onClick={() => setAiActiveTab('instances')}
                className={`px-4 py-2 rounded-t-lg ${aiActiveTab === 'instances' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Ollama Instances
              </button>
              <button
                onClick={() => setAiActiveTab('roles')}
                className={`px-4 py-2 rounded-t-lg ${aiActiveTab === 'roles' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Agent Roles
              </button>
              <button
                onClick={() => setAiActiveTab('settings')}
                className={`px-4 py-2 rounded-t-lg ${aiActiveTab === 'settings' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Settings
              </button>
            </div>

            {aiActiveTab === 'instances' && (
              <InstancesTabContent />
            )}

            {aiActiveTab === 'roles' && (
              <RolesTabContent />
            )}

            {aiActiveTab === 'settings' && (
              <SettingsTabContent />
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">User Management</h2>
            
            <div className="flex gap-2 mb-6 p-4 bg-slate-700/50 rounded-lg items-center">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username"
                className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password"
                className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'gm' | 'admin')} className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="gm">GM</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={addUser} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </div>

            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <span className="text-white">{user.username}</span>
                    {user.email && <span className="text-slate-400 ml-2">({user.email})</span>}
                    <span className="text-slate-400 ml-2">({user.role})</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingUser(user); setEditUsername(user.username); setEditEmail(user.email || ''); setEditRole(user.role as 'gm' | 'admin'); }} className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/40">
                      Edit
                    </button>
                    <button onClick={() => deleteUser(user.id)} className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-slate-500">No users yet</p>}
            </div>
            
            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-white mb-4">Edit User: {editingUser.username}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Role</label>
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'gm' | 'admin')} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                        <option value="gm">GM</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">New Password (leave blank to keep current)</label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  
                  {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
                  
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500">
                      Cancel
                    </button>
                    <button onClick={updateUser} disabled={loading} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">API Tokens</h2>
            <p className="text-slate-400 text-sm mb-4">
              Create tokens to give AI agents access to your campaign data. Tokens can be passed via URL query parameter (?token=xxx) or Authorization header.
            </p>
            
            <form onSubmit={createToken} className="flex gap-2 mb-4 p-4 bg-slate-700/50 rounded-lg items-end">
              <div className="flex-1">
                <label className="block text-slate-300 text-sm mb-1">Token Name</label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g., OpenWebUI, AI Agent"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div className="w-32">
                <label className="block text-slate-300 text-sm mb-1">Days Valid</label>
                <select
                  value={newTokenDays}
                  onChange={(e) => setNewTokenDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              <button type="submit" disabled={loading || !newTokenName} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap">
                Create Token
              </button>
            </form>

            {generatedToken && (
              <div className="mb-4 p-4 bg-green-900/30 border border-green-600 rounded-lg">
                <p className="text-green-400 text-sm font-medium mb-1">Token created! Copy it now - you won't see it again:</p>
                <code className="text-green-300 text-sm break-all">{generatedToken}</code>
              </div>
            )}

            <div className="space-y-2">
              {apiTokens.map(token => (
                <div key={token.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <span className="text-white">{token.name}</span>
                    <span className="text-slate-400 ml-2 text-sm">Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>
                  </div>
                  <button onClick={() => revokeToken(token.id)} className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40">
                    Revoke
                  </button>
                </div>
              ))}
              {apiTokens.length === 0 && <p className="text-slate-500">No API tokens yet</p>}
            </div>
          </div>
        )}
        
        {activeTab === 'email' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Email Settings (SMTP)</h2>
            <p className="text-slate-400 text-sm mb-4">
              Configure SMTP settings to enable password reset emails and other automated notifications.
            </p>
            
            <form onSubmit={saveSmtpSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpSettings.smtp_host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpSettings.smtp_port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                    placeholder="587"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={smtpSettings.smtp_user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpSettings.smtp_pass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                    placeholder="********"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-slate-300 text-sm mb-1">From Address</label>
                <input
                  type="text"
                  value={smtpSettings.smtp_from}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from: e.target.value })}
                  placeholder="noreply@example.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="smtpTls"
                  checked={smtpSettings.smtp_tls}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_tls: e.target.checked })}
                  className="w-5 h-5 bg-slate-700 border border-slate-600 rounded"
                />
                <label htmlFor="smtpTls" className="text-slate-300">
                  Use TLS/SSL (recommended)
                </label>
              </div>
              
              {error && <div className="text-red-400 text-sm">{error}</div>}
              {smtpSaved && <div className="text-emerald-400 text-sm">Settings saved!</div>}
              
              <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                {loading ? 'Saving...' : 'Save Email Settings'}
              </button>
              
              <div className="mt-6 pt-6 border-t border-slate-600">
                <h3 className="text-white font-semibold mb-3">Test Email Settings</h3>
                <p className="text-slate-400 text-sm mb-3">Send a test email to verify your SMTP settings are correct.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                  <button onClick={testEmailSettings} disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    Send Test
                  </button>
                </div>
                {testEmailStatus && (
                  <div className={`mt-2 text-sm ${testEmailStatus.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testEmailStatus}
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Version Info</h2>
            
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <div className="text-slate-400 text-sm mb-1">App Version</div>
              <div className="text-white text-lg font-mono">{buildInfo?.version || 'unknown'}</div>
              <div className="text-slate-400 text-sm mt-2">Build</div>
              <div className="text-white font-mono">{buildInfo?.build || buildInfo?.buildHash || 'unknown'}</div>
            </div>
          </div>
        )}

        {activeTab === 'portainer' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Portainer Integration</h2>

            {/* Version display */}
            {buildInfo && (
              <div className="text-sm text-slate-400 mb-4">
                Running build {buildInfo.build || buildInfo.buildHash}
              </div>
            )}

            {/* Status Section */}
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-white font-semibold mb-3">Portainer Status</h3>
              
              {/* URL Input Section */}
              <div className="mb-4 p-3 bg-slate-600 rounded">
                <label className="block text-slate-400 text-sm mb-1">Portainer URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={portainerUrlInput}
                    onChange={(e) => setPortainerUrlInput(e.target.value)}
                    placeholder="https://host.docker.internal:9443"
                    className="flex-1 bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white text-sm"
                  />
                  <button
                    onClick={async () => {
                      // Save URL then test
                      if (portainerUrlInput.trim()) {
                        await fetch('/api/admin/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ portainer_url: portainerUrlInput.trim() }),
                        });
                      }
                      // Reload status
                      loadBranchInfo();
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                  >
                    Test
                  </button>
                </div>
              </div>
              
              {/* Status error block */}
              {portainerStatus && !portainerStatus.ok && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 p-4 rounded mb-3">
                  <div className="font-semibold mb-1">
                    {portainerStatus.error || "Portainer status error"}
                  </div>
                  {portainerStatus.missingEnv && portainerStatus.missingEnv.length > 0 && (
                    <div className="text-sm text-red-400">
                      Missing environment variables: {portainerStatus.missingEnv.join(", ")}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {portainerStatus?.ok && portainerStatus.reachable && (
                  <span className="text-green-400">Portainer reachable</span>
                )}
                {!portainerStatus?.ok && portainerStatus?.missingEnv && portainerStatus.missingEnv.length > 0 && (
                  <span className="text-yellow-400">
                    Configuration incomplete — missing environment variables.
                  </span>
                )}
                {!portainerStatus?.ok && !portainerStatus?.missingEnv && (
                  <span className="text-red-400">Portainer unreachable.</span>
                )}
                {portainerStatus?.apiUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">API URL:</span>
                    <code className="text-sm">{portainerStatus.apiUrl}</code>
                  </div>
                )}
                {portainerStatus?.tried && portainerStatus.tried.length > 0 && (
                  <div className="text-sm text-red-400 mt-1">
                    Tried URLs:
                    <ul className="list-disc ml-5">
                      {portainerStatus.tried.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Stack Section */}
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-white font-semibold mb-3">Target Stack</h3>
              
              {!portainerStatus?.reachable ? (
                <div className="text-slate-400">Portainer not reachable</div>
              ) : portainerStack?.ok && portainerStack.name ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Name:</span>
                    <span>{portainerStack.name}</span>
                  </div>
                  {portainerStack.id !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">ID:</span>
                      <code className="text-sm">{portainerStack.id}</code>
                    </div>
                  )}
                  {portainerStack.repoUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Repo URL:</span>
                      <code className="text-sm">{portainerStack.repoUrl}</code>
                    </div>
                  )}
                  {portainerStack.branch && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Current Branch:</span>
                      <span className="text-green-400 font-semibold">
                        {portainerStack.branch === 'dev' ? 'Dev' : 
                         ['main', 'stable'].includes(portainerStack.branch) ? 'Stable' : 
                         portainerStack.branch}
                      </span>
                    </div>
                  )}
                  
                  {/* Branch Selection Dropdown */}
                  {portainerStack.branch && (
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={(portainerBranchInput || 
                          (portainerStack.branch === 'dev' ? 'refs/heads/dev' : 'refs/heads/stable'))}
                        onChange={(e) => setPortainerBranchInput(e.target.value)}
                        className="bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white"
                      >
                        <option value="refs/heads/stable">Stable</option>
                        <option value="refs/heads/dev">Dev</option>
                      </select>
                      <button
                        onClick={async () => {
                          if (!portainerStack?.id || !portainerBranchInput) return;
                          setUpdatingBranch(true);
                          setBranchUpdateStatus('');
                          try {
                            const res = await fetch('/api/portainer/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                stackId: portainerStack.id, 
                                branch: portainerBranchInput 
                              }),
                            });
                            const data = await res.json();
                            if (data.error) {
                              setBranchUpdateStatus('Error: ' + data.error);
                            } else {
                              setBranchUpdateStatus('Updated to ' + portainerBranchInput);
                              loadBranchInfo();
                            }
                          } catch (e) {
                            setBranchUpdateStatus('Error updating');
                          } finally {
                            setUpdatingBranch(false);
                          }
                        }}
                        disabled={updatingBranch}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50"
                      >
                        {updatingBranch ? 'Updating...' : 'Update'}
                      </button>
                      {branchUpdateStatus && (
                        <span className={branchUpdateStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>
                          {branchUpdateStatus}
                        </span>
                      )}
                    </div>
                  )}
                  {portainerStack.webhooks && portainerStack.webhooks.length > 0 && (
                    <div className="mt-2">
                      <span className="text-slate-400 text-sm">Webhooks:</span>
                      {portainerStack.webhooks.map((url, i) => (
                        <code key={i} className="block text-xs text-slate-500 mt-1">{url}</code>
                      ))}
                    </div>
                  )}
                </div>
              ) : portainerStack?.error ? (
                <div className="text-red-400 text-sm">{portainerStack.error}</div>
              ) : (
                <div className="text-slate-400">Loading stack info...</div>
              )}
            </div>

            {/* Update Section */}
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-white font-semibold mb-3">Update Stack</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Branch name</label>
                  <input
                    type="text"
                    value={portainerBranchInput}
                    onChange={(e) => setPortainerBranchInput(e.target.value)}
                    placeholder="e.g., main, stable, dev"
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white placeholder-slate-500"
                    disabled={!portainerStatus?.ok}
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!portainerStatus?.ok || !portainerBranchInput.trim()) return;
                    setUpdatingBranch(true);
                    setBranchUpdateStatus('');
                    try {
                      const res = await fetch('/api/portainer/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ branch: portainerBranchInput.trim() }),
                      });
                      const data = await res.json();
                      if (res.ok && data.ok) {
                        setBranchUpdateStatus(data.message);
                      } else {
                        setBranchUpdateStatus(data.error || 'Update failed');
                      }
                    } catch (err) {
                      setBranchUpdateStatus('Request failed');
                    } finally {
                      setUpdatingBranch(false);
                    }
                  }}
                  disabled={!portainerStatus?.ok || !portainerBranchInput.trim() || updatingBranch}
                  className={`px-4 py-2 rounded ${
                    portainerStatus?.ok && portainerBranchInput.trim() && !updatingBranch
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-slate-600 cursor-not-allowed'
                  }`}
                >
                  {updatingBranch ? 'Updating...' : 'Update Stack'}
                </button>

                {branchUpdateStatus && (
                  <div className={`p-3 rounded ${
                    branchUpdateStatus.includes('success') || branchUpdateStatus.includes('Pulled from') || branchUpdateStatus.includes('Updated')
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}>
                    {branchUpdateStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-tab content components
function InstancesTabContent() {
  const [aiInstances, setAiInstances] = useState<OllamaInstance[]>([]);
  const [aiModels, setAiModels] = useState<AvailableModel[]>([]);
  const [expandedInstance, setExpandedInstance] = useState<number | null>(null);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<OllamaInstance | null>(null);
  const [instanceForm, setInstanceForm] = useState({ name: '', base_url: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');

  useEffect(() => { loadInstances(); }, []);
  useEffect(() => { 
    if (expandedInstance) loadAllModels(); 
  }, [expandedInstance]);

  async function loadInstances() {
    try {
      const res = await fetch('/api/admin/instances');
      const data = await res.json();
      setAiInstances(data.instances || []);
    } catch (e) { console.error(e); }
  }

  async function loadAllModels() {
    try {
      const res = await fetch('/api/admin/models');
      const data = await res.json();
      setAiModels(data.models || []);
    } catch (e) { console.error(e); }
  }

  function getModelsForInstance(instanceId: number) {
    return aiModels.filter(m => m.instance_id === instanceId);
  }

  async function checkHealth(instance: OllamaInstance) {
    try {
      const res = await fetch(`/api/admin/instances/${instance.id}/health`, { method: 'POST' });
      const data = await res.json();
      setAiSuccess(data.status === 'online' ? `Instance ${instance.name} is online` : `Instance ${instance.name} is offline`);
      loadInstances();
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess(`Failed to check health`);
      setTimeout(() => setAiSuccess(''), 3000);
    }
  }

  async function discoverModels(instance: OllamaInstance) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/instances/${instance.id}/discover`, { method: 'POST' });
      const data = await res.json();
      setAiSuccess(`Discovered ${data.discovered || 0} models on ${instance.name}`);
      loadInstances();
      await loadAllModels();
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to discover models');
      setTimeout(() => setAiSuccess(''), 3000);
    }
    setLoading(false);
  }

  async function saveInstance() {
    setLoading(true);
    try {
      const url = editingInstance ? `/api/admin/instances/${editingInstance.id}` : '/api/admin/instances';
      const method = editingInstance ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instanceForm),
      });
      setAiSuccess(editingInstance ? 'Instance updated' : 'Instance added');
      loadInstances();
      setShowInstanceModal(false);
      setEditingInstance(null);
      setInstanceForm({ name: '', base_url: '', description: '' });
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to save instance');
    }
    setLoading(false);
  }

  async function deleteInstance(instance: OllamaInstance) {
    if (!confirm(`Delete ${instance.name}?`)) return;
    try {
      await fetch(`/api/admin/instances/${instance.id}`, { method: 'DELETE' });
      setAiSuccess('Instance deleted');
      loadInstances();
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to delete');
    }
  }

  return (
    <div>
      {aiSuccess && <div className="mb-4 p-3 bg-emerald-900/30 text-emerald-400 rounded-lg">{aiSuccess}</div>}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setShowInstanceModal(true); setEditingInstance(null); setInstanceForm({ name: '', base_url: '', description: '' }); }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Add Instance
        </button>
      </div>
      <div className="space-y-2">
        {aiInstances.length === 0 ? (
          <p className="text-slate-400">No Ollama instances configured. Add one to get started.</p>
        ) : (
          aiInstances.map(instance => (
            <div key={instance.id} className="bg-slate-700/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 cursor-pointer" onClick={() => setExpandedInstance(expandedInstance === instance.id ? null : instance.id)}>
                  <div className="text-white font-medium">{instance.name}</div>
                  <div className="text-slate-400 text-sm">{instance.base_url}</div>
                  <div className="text-slate-500 text-xs">
                    Status: {instance.health_status || 'unknown'} | Last check: {instance.last_health_check ? new Date(instance.last_health_check).toLocaleString() : 'never'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); checkHealth(instance); }} className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500">Check</button>
                  <button onClick={(e) => { e.stopPropagation(); discoverModels(instance); }} disabled={loading} className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500">Discover</button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingInstance(instance); setInstanceForm({ name: instance.name, base_url: instance.base_url, description: instance.description || '' }); setShowInstanceModal(true); }} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteInstance(instance); }} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500">Delete</button>
                </div>
              </div>
              {expandedInstance === instance.id && (
                <div className="px-4 pb-4 border-t border-slate-600">
                  <div className="mt-3">
                    <div className="text-slate-400 text-xs uppercase mb-2">Discovered Models ({getModelsForInstance(instance.id).length})</div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {getModelsForInstance(instance.id).length === 0 ? (
                        <p className="text-slate-500 text-sm">No models discovered. Click Discover to scan this instance.</p>
                      ) : (
                        getModelsForInstance(instance.id).map(model => (
                          <div key={model.id} className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded">
                            <div>
                              <span className="text-white">{model.model_tag}</span>
                              {model.parameter_size && <span className="text-slate-400 ml-2">({model.parameter_size})</span>}
                              {model.quantization && <span className="text-slate-500 ml-1">{model.quantization}</span>}
                            </div>
                            <span className={`text-xs ${model.is_available ? 'text-emerald-400' : 'text-red-400'}`}>
                              {model.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {showInstanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">{editingInstance ? 'Edit Instance' : 'Add Ollama Instance'}</h3>
            <div className="space-y-4">
              <div><label className="block text-slate-300 text-sm mb-1">Name</label><input type="text" value={instanceForm.name} onChange={(e) => setInstanceForm({ ...instanceForm, name: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Local Ollama" /></div>
              <div><label className="block text-slate-300 text-sm mb-1">Base URL</label><input type="text" value={instanceForm.base_url} onChange={(e) => setInstanceForm({ ...instanceForm, base_url: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="http://localhost:11434" /></div>
              <div><label className="block text-slate-300 text-sm mb-1">Description</label><textarea value={instanceForm.description} onChange={(e) => setInstanceForm({ ...instanceForm, description: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={3} placeholder="Optional..." /></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowInstanceModal(false); setEditingInstance(null); setInstanceForm({ name: '', base_url: '', description: '' }); }} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500">Cancel</button>
              <button onClick={saveInstance} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RolesTabContent() {
  const [aiRoles, setAiRoles] = useState<AgentRole[]>([]);
  const [aiModels, setAiModels] = useState<AvailableModel[]>([]);
  const [rolePrompts, setRolePrompts] = useState<Record<number, SystemPrompt[]>>({});
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingRole, setTestingRole] = useState('');
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editPromptTexts, setEditPromptTexts] = useState<Record<number, string>>({});
  const [editPromptNotesMap, setEditPromptNotesMap] = useState<Record<number, string>>({});

  useEffect(() => { loadRoles(); loadModels(); }, []);

  async function loadRoles() {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      setAiRoles(data.roles || []);
    } catch (e) { console.error(e); }
  }

  async function loadModels() {
    try {
      const res = await fetch('/api/admin/models');
      const data = await res.json();
      setAiModels(data.models || []);
    } catch (e) { console.error(e); }
  }

  async function loadPromptsForRole(roleId: number) {
    try {
      const res = await fetch(`/api/admin/prompts/${roleId}`);
      const data = await res.json();
      setRolePrompts(prev => ({ ...prev, [roleId]: data.prompts || [] }));
    } catch (e) { console.error(e); }
  }

  async function saveAssignment(roleId: number, modelId: number, priority: number = 1) {
    setSaving(true);
    try {
      const existingRes = await fetch(`/api/admin/assignments?role_id=${roleId}`);
      const existingData = await existingRes.json();
      const assignments = existingData.assignments || [];
      const existing = assignments.find((a: any) => a.priority === priority);
      
      if (existing) {
        await fetch(`/api/admin/assignments/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: modelId }),
        });
      } else {
        await fetch('/api/admin/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_id: roleId, model_id: modelId, priority }),
        });
      }
      setAiSuccess('Assignment saved');
      loadRoles();
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to save assignment');
    }
    setSaving(false);
  }

  async function saveNewPromptVersion(roleId: number) {
    const promptText = editPromptTexts[roleId] || '';
    const notes = editPromptNotesMap[roleId] || '';
    if (!promptText.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/prompts/${roleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_text: promptText, notes }),
      });
      setAiSuccess('Prompt version saved');
      loadPromptsForRole(roleId);
      await loadRoles();
      setEditPromptNotesMap(prev => ({ ...prev, [roleId]: '' }));
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to save prompt');
    }
    setSaving(false);
  }

  async function activatePromptVersion(roleId: number, promptId: number) {
    try {
      await fetch(`/api/admin/prompts/${roleId}/activate/${promptId}`, { method: 'PUT' });
      setAiSuccess('Prompt activated');
      loadPromptsForRole(roleId);
      loadRoles();
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to activate prompt');
    }
  }

  async function runTestAgent() {
    if (!testPrompt) return;
    setTesting(true);
    try {
      const res = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleKey: testingRole, testPrompt: testPrompt }),
      });
      const data = await res.json();
      setTestResult(data.content || data.error || 'No response');
    } catch (e) {
      setTestResult('Error calling AI');
    }
    setTesting(false);
  }

  function getModelsGroupedByInstance() {
    const grouped: Record<string, AvailableModel[]> = {};
    for (const model of aiModels) {
      const instanceName = model.instance_name || 'Unknown';
      if (!grouped[instanceName]) grouped[instanceName] = [];
      grouped[instanceName].push(model);
    }
    return grouped;
  }

  function getCurrentAssignment(roleId: number, priority: number = 1) {
    const role = aiRoles.find(r => r.id === roleId);
    if (!role?.assignments) return null;
    return role.assignments.find(a => a.priority === priority) || null;
  }

  function getAssignmentDisplay(roleId: number) {
    const role = aiRoles.find(r => r.id === roleId);
    if (!role?.assignments?.length) return null;
    const primary = role.assignments.find(a => a.priority === 1);
    const fallback = role.assignments.find(a => a.priority === 2);
    const parts = [];
    if (primary) parts.push(`Primary: ${primary.model_tag} (${primary.instance_name})`);
    if (fallback) parts.push(`Fallback: ${fallback.model_tag} (${fallback.instance_name})`);
    return parts.join(' | ');
  }

  function hasUnsavedChanges(roleId: number): boolean {
    const role = aiRoles.find(r => r.id === roleId);
    if (!role?.activePrompt) return !!(editPromptTexts[roleId] || '').trim();
    const currentText = editPromptTexts[roleId] || '';
    return currentText !== role.activePrompt.prompt_text;
  }

  return (
    <div>
      {aiSuccess && <div className="mb-4 p-3 bg-emerald-900/30 text-emerald-400 rounded-lg">{aiSuccess}</div>}
      <div className="space-y-2">
        {aiRoles.length === 0 ? (
          <p className="text-slate-400">No agent roles configured.</p>
        ) : (
          aiRoles.map(role => (
            <div key={role.id} className="bg-slate-700/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => {
                if (expandedRole === role.id) {
                  setExpandedRole(null);
                } else {
                  setExpandedRole(role.id);
                  loadPromptsForRole(role.id);
                  // Initialize per-role prompt text only if not already edited
                  if (!editPromptTexts[role.id]) {
                    setEditPromptTexts(prev => ({ ...prev, [role.id]: role.activePrompt?.prompt_text || '' }));
                  }
                  if (!editPromptNotesMap[role.id]) {
                    setEditPromptNotesMap(prev => ({ ...prev, [role.id]: '' }));
                  }
                }
              }}>
                <div>
                  <div className="text-white font-medium">{role.icon} {role.display_name}</div>
                  <div className="text-slate-400 text-sm">{role.description}</div>
                  {getAssignmentDisplay(role.id) && (
                    <div className="text-emerald-400 text-xs mt-1">{getAssignmentDisplay(role.id)}</div>
                  )}
                </div>
                <div className="text-slate-400">{expandedRole === role.id ? '▼' : '▶'}</div>
              </div>
              {expandedRole === role.id && (
                <div className="px-4 pb-4 border-t border-slate-600">
                  {/* Model Assignment */}
                  <div className="mt-4">
                    <div className="text-slate-400 text-xs uppercase mb-2">Model Assignment</div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-300 text-sm mb-1">Primary Model</label>
                        <select
                          value={getCurrentAssignment(role.id, 1)?.model_id || ''}
                          onChange={(e) => {
                            if (e.target.value) saveAssignment(role.id, parseInt(e.target.value), 1);
                          }}
                          disabled={saving}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                          <option value="">Select model...</option>
                          {Object.entries(getModelsGroupedByInstance()).map(([instanceName, models]) => (
                            <optgroup key={instanceName} label={instanceName}>
                              {models.map(model => (
                                <option key={model.id} value={model.id}>
                                  {instanceName} / {model.model_tag}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm mb-1">Fallback Model (Priority 2)</label>
                        <select
                          value={getCurrentAssignment(role.id, 2)?.model_id || ''}
                          onChange={(e) => {
                            if (e.target.value) saveAssignment(role.id, parseInt(e.target.value), 2);
                          }}
                          disabled={saving}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                          <option value="">Select fallback...</option>
                          {Object.entries(getModelsGroupedByInstance()).map(([instanceName, models]) => (
                            <optgroup key={instanceName} label={instanceName}>
                              {models.map(model => (
                                <option key={model.id} value={model.id}>
                                  {instanceName} / {model.model_tag}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  {/* System Prompt */}
                  <div className="mt-4">
                    <div className="text-slate-400 text-xs uppercase mb-2">
                      System Prompt {role.activePrompt ? `(v${role.activePrompt.version} - active)` : ''}
                      {hasUnsavedChanges(role.id) && <span className="text-amber-400 ml-2">(unsaved)</span>}
                    </div>
                    <textarea
                      value={editPromptTexts[role.id] || ''}
                      onChange={(e) => setEditPromptTexts(prev => ({ ...prev, [role.id]: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      rows={6}
                      placeholder="Enter system prompt..."
                    />
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editPromptNotesMap[role.id] || ''}
                        onChange={(e) => setEditPromptNotesMap(prev => ({ ...prev, [role.id]: e.target.value }))}
                        className="w-full px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        placeholder="Notes (optional)"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => saveNewPromptVersion(role.id)}
                        disabled={saving || !(editPromptTexts[role.id] || '').trim()}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        Save New Version
                      </button>
                      <button
                        onClick={() => setEditPromptTexts(prev => ({ ...prev, [role.id]: role.activePrompt?.prompt_text || '' }))}
                        className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500"
                      >
                        Reset
                      </button>
                    </div>
                    {/* Prompt Version History */}
                    {rolePrompts[role.id]?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-slate-400 text-xs uppercase mb-2">Version History</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {rolePrompts[role.id].map(prompt => (
                            <div key={prompt.id} className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded">
                              <div>
                                <span className="text-white">v{prompt.version}</span>
                                {prompt.is_active ? <span className="text-emerald-400 ml-2">(active)</span> : null}
                                {prompt.notes && <span className="text-slate-400 ml-2">- {prompt.notes}</span>}
                              </div>
                              {!prompt.is_active && (
                                <button
                                  onClick={() => activatePromptVersion(role.id, prompt.id)}
                                  className="px-2 py-0.5 text-xs bg-slate-600 text-white rounded hover:bg-slate-500"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Test Agent */}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => { setTestingRole(role.role_key); setShowTestModal(true); }} className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">Test Agent</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Test AI Agent ({testingRole})</h3>
            <div className="space-y-4">
              <div><label className="block text-slate-300 text-sm mb-1">Test Prompt</label><textarea value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={4} placeholder="Enter test prompt..." /></div>
              {testResult && <div><label className="block text-slate-300 text-sm mb-1">Response</label><div className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto">{testResult}</div></div>}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowTestModal(false); setTestPrompt(''); setTestResult(''); }} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500">Close</button>
              <button onClick={runTestAgent} disabled={testing || !testPrompt} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{testing ? 'Testing...' : 'Run Test'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTabContent() {
  const [aiAppSettings, setAiAppSettings] = useState<AppSetting[]>([]);
  const [aiSuccess, setAiSuccess] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/admin/app-settings');
      const data = await res.json();
      setAiAppSettings(data.settings || []);
    } catch (e) { console.error(e); }
  }

  async function saveSetting(key: string) {
    try {
      await fetch(`/api/admin/app-settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue }),
      });
      setAiSuccess(`Setting ${key} updated`);
      loadSettings();
      setEditingKey('');
      setEditValue('');
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (e) {
      setAiSuccess('Failed to save');
    }
  }

  return (
    <div>
      {aiSuccess && <div className="mb-4 p-3 bg-emerald-900/30 text-emerald-400 rounded-lg">{aiSuccess}</div>}
      <div className="space-y-2">
        {aiAppSettings.length === 0 ? (
          <p className="text-slate-400">No settings configured.</p>
        ) : (
          aiAppSettings.map(setting => (
            <div key={setting.key} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              {editingKey === setting.key ? (
                <div className="flex-1 flex gap-2">
                  <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 px-3 py-1 bg-slate-600 border border-slate-500 rounded text-white" />
                  <button onClick={() => saveSetting(setting.key)} className="px-3 py-1 bg-purple-600 text-white text-sm rounded">Save</button>
                  <button onClick={() => setEditingKey('')} className="px-3 py-1 bg-slate-600 text-white text-sm rounded">Cancel</button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-white font-mono">{setting.key}</div>
                    <div className="text-slate-400 text-sm">{setting.value}</div>
                    {setting.description && <div className="text-slate-500 text-xs">{setting.description}</div>}
                  </div>
                  <button onClick={() => { setEditingKey(setting.key); setEditValue(setting.value); }} className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500">Edit</button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
