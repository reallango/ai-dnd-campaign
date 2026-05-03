'use client';

import { useState, useEffect } from 'react';

interface Settings {
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_key: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    ai_provider: 'ollama',
    ai_base_url: 'http://localhost:11434',
    ai_model: 'llama3',
    ai_api_key: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'users'>('settings');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // User management
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'gm' | 'admin'>('gm');

  useEffect(() => {
    setMounted(true);
    
    // Check auth
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    loadSettings();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) return;
      
      const user = JSON.parse(userStr);
      const res = await fetch('/api/auth/users', {
        headers: { 
          'Authorization': token,
          'x-user-id': user.id.toString()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to load users', e);
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
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) throw new Error('Not authenticated');
      
      const user = JSON.parse(userStr);
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token,
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) throw new Error('Not authenticated');
      
      const user = JSON.parse(userStr);
      await fetch(`/api/auth/users?id=${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': token,
          'x-user-id': user.id.toString()
        }
      });
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-md">
        <div className="loading-spinner" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-md">
      <div className="container" style={{ maxWidth: '600px' }}>
        <div className="text-center mb-lg animate-slide-up">
          <h1 className="text-gold mb-sm">⚙️ Admin Settings</h1>
          <p className="text-secondary">Manage AI config & users</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-md mb-md">
          <button
            onClick={() => setActiveTab('settings')}
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} flex-1`}
          >
            🤖 AI Settings
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} flex-1`}
          >
            👥 Users
          </button>
        </div>

        {activeTab === 'settings' && (
          <form onSubmit={saveSettings} className="card animate-slide-up">
            <div className="card-header">
              <span className="text-gold">🤖</span> AI Configuration
            </div>

            <div className="flex flex-col gap-md">
              <div>
                <label className="block text-secondary mb-sm">AI Provider</label>
                <select
                  value={settings.ai_provider}
                  onChange={(e) => setSettings({ ...settings, ai_provider: e.target.value })}
                  className="w-full"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>

              <div>
                <label className="block text-secondary mb-sm">Base URL</label>
                <input
                  type="text"
                  value={settings.ai_base_url}
                  onChange={(e) => setSettings({ ...settings, ai_base_url: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-secondary mb-sm">Model</label>
                <input
                  type="text"
                  value={settings.ai_model}
                  onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                  placeholder="llama3"
                  className="w-full"
                />
              </div>

              {(settings.ai_provider === 'openai' || settings.ai_provider === 'anthropic' || settings.ai_provider === 'deepseek') && (
                <div>
                  <label className="block text-secondary mb-sm">API Key</label>
                  <input
                    type="password"
                    value={settings.ai_api_key}
                    onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full"
                  />
                </div>
              )}

              {error && <div className="text-crimson text-center">{error}</div>}

              {saved && <div className="text-emerald text-center">Settings saved!</div>}

              <div className="flex gap-md mt-md">
                <button type="button" onClick={testConnection} disabled={loading} className="btn btn-secondary flex-1">
                  {loading ? 'Testing...' : 'Test Connection'}
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'users' && (
          <div className="card animate-slide-up">
            <div className="card-header">
              <span className="text-gold">👥</span> User Management
            </div>

            {/* Add user form */}
            <div className="flex flex-col gap-sm mb-lg" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <h3 className="text-gold">Add New User</h3>
              <div className="flex gap-sm">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  className="flex-1"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1"
                />
              </div>
              <div className="flex gap-sm">
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'gm' | 'admin')} className="flex-1">
                  <option value="gm">GM</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={addUser} disabled={loading || !newUsername || !newPassword} className="btn btn-primary">
                  Add User
                </button>
              </div>
            </div>

            {/* User list */}
            <div className="flex flex-col gap-sm">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                  <div>
                    <span className="text-gold">{user.username}</span>
                    <span className="text-muted" style={{ marginLeft: '0.5rem' }}>({user.role})</span>
                  </div>
                  <button onClick={() => deleteUser(user.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                    Delete
                  </button>
                </div>
              ))}
              {users.length === 0 && <p className="text-muted">No users yet</p>}
            </div>
          </div>
        )}

        <div className="flex gap-md mt-lg">
          <button onClick={handleLogout} className="btn btn-secondary flex-1">
            Logout
          </button>
        </div>

        <footer className="footer">
          <p className="text-muted">
            <a href="/" className="text-gold">← Back to Home</a>
          </p>
        </footer>
      </div>
    </main>
  );
}