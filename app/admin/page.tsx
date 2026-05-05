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
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'tokens' | 'email' | 'updates'>('settings');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  
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

  useEffect(() => {
    loadData();
  }, []);

  // Load Portainer branch info when switching to updates tab
  useEffect(() => {
    if (activeTab === 'updates') {
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
      const res = await fetch('/api/portainer/branches');
      const data = await res.json();
      
      // Check if Portainer is available
      setPortainerAvailable(data.available === true);
      setPortainerUrl(data.detectedUrl || null);
      
      if (!data.available) {
        setBranchUpdateStatus(data.error || 'Portainer API not detected');
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
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            🤖 AI Settings
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
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
          >
            📜 Campaigns
          </button>
        </div>

        {activeTab === 'settings' && (
          <form onSubmit={saveSettings} className="bg-slate-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">AI Configuration</h2>
            
            <div>
              <label className="block text-slate-300 text-sm mb-1">AI Provider</label>
              <select
                value={settings.ai_provider}
                onChange={(e) => setSettings({ ...settings, ai_provider: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1">Base URL</label>
              <input
                type="text"
                value={settings.ai_base_url}
                onChange={(e) => setSettings({ ...settings, ai_base_url: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1">Model</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.ai_model}
                  onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="llama3"
                />
                <button 
                  type="button" 
                  onClick={fetchModels}
                  disabled={fetchingModels || !settings.ai_base_url}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded whitespace-nowrap"
                >
                  {fetchingModels ? 'Loading...' : 'Get Models'}
                </button>
              </div>
              {availableModels.length > 0 && (
                <select
                  value={settings.ai_model }
                  onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                  className="mt-2 w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select model...</option>
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Context Window (tokens)</label>
                <select
                  value={settings.ai_context_window}
                  onChange={(e) => setSettings({ ...settings, ai_context_window: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="2048">2K</option>
                  <option value="4096">4K</option>
                  <option value="8192">8K</option>
                  <option value="16384">16K</option>
                  <option value="32768">32K</option>
                  <option value="65536">64K</option>
                  <option value="128000">128K</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-1">Timeout (seconds)</label>
                <input
                  type="number"
                  value={settings.ai_timeout}
                  onChange={(e) => setSettings({ ...settings, ai_timeout: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Keep Model Loaded (seconds)</label>
                <select
                  value={settings.ai_keep_loaded}
                  onChange={(e) => setSettings({ ...settings, ai_keep_loaded: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="-1"> Forever (-1)</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-1">Check Loaded Models</label>
                <button 
                  type="button" 
                  onClick={checkLoadedModels}
                  disabled={checkingLoaded || settings.ai_provider !== 'ollama'}
                  className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                >
                  {checkingLoaded ? 'Checking...' : 'Check Loaded Models'}
                </button>
              </div>
            </div>

            {loadedModels.length > 0 && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-white font-medium mb-2">Currently Loaded Models</h4>
                <p className="text-slate-400 text-sm mb-2">Click Unload to immediately remove a model from memory.</p>
                <div className="space-y-2">
                  {loadedModels.map(model => (
                    <div key={model} className="flex justify-between items-center">
                      <span className="text-slate-300">{model}</span>
                      <button 
                        type="button"
                        onClick={() => unloadModel(model)}
                        className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 text-sm"
                      >
                        Unload
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(settings.ai_provider === 'openai' || settings.ai_provider === 'anthropic' || settings.ai_provider === 'deepseek') && (
              <div>
                <label className="block text-slate-300 text-sm mb-1">API Key</label>
                <input
                  type="password"
                  value={settings.ai_api_key}
                  onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="adultContent"
                checked={settings.ai_adult_content === 'true'}
                onChange={(e) => setSettings({ ...settings, ai_adult_content: e.target.checked ? 'true' : 'false' })}
                className="w-5 h-5 bg-slate-700 border border-slate-600 rounded"
              />
              <label htmlFor="adultContent" className="text-slate-300">
                Enable adult content (disable AI safety filters)
              </label>
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}
            {saved && <div className="text-emerald-400 text-sm">Settings saved!</div>}

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={testConnection} disabled={loading} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                {loading ? 'Testing...' : 'Test Connection'}
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
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
            <h2 className="text-xl font-semibold text-white mb-4">Software Updates</h2>
            
            {/* Version info from config */}
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <div className="text-slate-400 text-sm mb-1">App Version</div>
              <div className="text-white text-lg font-mono">{APP_VERSION}</div>
              <div className="text-slate-400 text-sm mt-2">Branch</div>
              <div className="text-white font-mono">{APP_BRANCH}</div>
            </div>

            {/* Portainer connection status */}
            <div className={`mb-4 p-3 rounded-lg ${portainerAvailable ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
              <div className={portainerAvailable ? 'text-emerald-400' : 'text-red-400'}>
                {portainerAvailable ? `Connected: ${portainerUrl}` : 'Portainer not detected'}
              </div>
            </div>

            {portainerAvailable && (
              <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                <h3 className="text-white font-semibold mb-3">Deploy Branch</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Select which branch to deploy. Click "Update" to apply the change.
                </p>
                
                {/* Branch selector */}
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-slate-400">Branch:</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="bg-slate-600 text-white px-3 py-2 rounded-lg border border-slate-500"
                  >
                    {availableBranches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>

                {/* Update button */}
                <button
                  onClick={updateBranch}
                  disabled={updatingBranch}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {updatingBranch ? 'Updating...' : 'Update'}
                </button>

                {branchUpdateStatus && (
                  <div className={`mt-4 p-3 rounded-lg ${branchUpdateStatus.includes('success') || branchUpdateStatus.includes('Switched') ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                    <div className={branchUpdateStatus.includes('success') || branchUpdateStatus.includes('Switched') ? 'text-emerald-400' : 'text-red-400'}>
                      {branchUpdateStatus}
                    </div>
                  </div>
                )}
              </div>
            )}

            {portainerAvailable && deployInfo && (
              <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                <div className="text-slate-400 text-sm">Current Deploy Branch</div>
                <div className="text-white font-mono text-lg">{deployInfo.currentBranch}</div>
                {deployInfo.pendingBranch && (
                  <div className="mt-2">
                    <div className="text-slate-400 text-sm">Pending Branch</div>
                    <div className="text-yellow-400 font-mono">{deployInfo.pendingBranch}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
