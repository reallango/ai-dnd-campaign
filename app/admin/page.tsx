'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [activeTab, setActiveTab] = useState<'settings' | 'users'>('settings');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'gm' | 'admin'>('gm');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meRes, settingsRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/users'),
      ]);
      
      const meData = await meRes.json();
      const settingsData = await settingsRes.json();
      const usersData = await usersRes.json();
      
      if (!meData.user || meData.user.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(meData.user);
      if (settingsData.ai_provider) {
        setSettings(settingsData);
      }
      setUsers(usersData.users || []);
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

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setNewUsername('');
      setNewPassword('');
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
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
              <button onClick={addUser} disabled={loading || !newUsername || !newPassword} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 whitespace-nowrap">
                Add User
              </button>
            </div>

            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <span className="text-white">{user.username}</span>
                    <span className="text-slate-400 ml-2">({user.role})</span>
                  </div>
                  <button onClick={() => deleteUser(user.id)} className="px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40">
                    Delete
                  </button>
                </div>
              ))}
              {users.length === 0 && <p className="text-slate-500">No users yet</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
