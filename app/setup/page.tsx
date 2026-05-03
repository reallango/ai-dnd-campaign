'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  
  // Admin fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // AI fields
  const [aiProvider, setAiProvider] = useState('ollama');
  const [aiBaseUrl, setAiBaseUrl] = useState('http://localhost:11434');
  const [aiModel, setAiModel] = useState('llama3');
  const [aiApiKey, setAiApiKey] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      setLoading(false);
      return;
    }
    if (!username) {
      setError('Username is required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, isFirstTime: true }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create admin');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const settings = {
      ai_provider: aiProvider,
      ai_base_url: aiBaseUrl,
      ai_model: aiModel,
      ai_api_key: aiApiKey,
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save settings');
      }

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
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
        body: JSON.stringify({
          ai_provider: aiProvider,
          ai_base_url: aiBaseUrl,
          ai_model: aiModel,
          ai_api_key: aiApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection failed');
      }
      alert(`Connected! Model: ${data.model}`);
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
      <div className="container" style={{ maxWidth: '500px' }}>
        <div className="text-center mb-lg">
          <h1 className="text-gold mb-sm">⚙️ Setup</h1>
          <p className="text-secondary">
            {step === 1 ? 'Step 1: Create Admin Account' : 'Step 2: Configure AI'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleAdminSubmit} className="card animate-slide-up">
            <div className="flex flex-col gap-md">
              <div>
                <label className="block text-secondary mb-sm">Admin Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-secondary mb-sm">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-secondary mb-sm">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                  required
                />
              </div>
              {error && <div className="text-crimson text-center">{error}</div>}
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleAISubmit} className="card animate-slide-up">
            <div className="flex flex-col gap-md">
              <div>
                <label className="block text-secondary mb-sm">AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
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
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-secondary mb-sm">Model</label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="llama3"
                  className="w-full"
                />
              </div>
              {(aiProvider === 'openai' || aiProvider === 'anthropic' || aiProvider === 'deepseek') && (
                <div>
                  <label className="block text-secondary mb-sm">API Key</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full"
                  />
                </div>
              )}
              {error && <div className="text-crimson text-center">{error}</div>}
              <div className="flex gap-md">
                <button type="button" onClick={testConnection} disabled={loading} className="btn btn-secondary flex-1">
                  Test
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          </form>
        )}

        <footer className="footer">
          <p className="text-muted">
            <a href="/" className="text-gold">← Back to Home</a>
          </p>
        </footer>
      </div>
    </main>
  );
}