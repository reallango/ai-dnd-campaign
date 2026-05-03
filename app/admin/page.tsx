'use client';

import { useState, useEffect } from 'react';

interface Settings {
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_key: string;
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    ai_provider: 'ollama',
    ai_base_url: 'http://localhost:11434',
    ai_model: 'llama3',
    ai_api_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    loadSettings();
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
          <p className="text-secondary">Configure AI connection</p>
        </div>

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
              <button
                type="button"
                onClick={testConnection}
                disabled={loading}
                className="btn btn-secondary flex-1"
              >
                {loading ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>

        <footer className="footer">
          <p className="text-muted">
            <a href="/" className="text-gold">← Back to Home</a>
          </p>
        </footer>
      </div>
    </main>
  );
}