'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'login' | 'join'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [campaignCode, setCampaignCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          router.push('/dashboard');
        }
      }
    } catch (e) {
      // Not logged in, stay on page
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (e) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignCode.trim()) {
      setError('Please enter a campaign code');
      return;
    }
    router.push(`/player/${campaignCode.trim().toUpperCase()}`);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚔️ AI D&D</h1>
          <p className="text-purple-300">Dungeon Master Assistant</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex mb-6 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 px-4 rounded-md transition ${
              mode === 'login' 
                ? 'bg-purple-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('join'); setError(''); }}
            className={`flex-1 py-2 px-4 rounded-md transition ${
              mode === 'join' 
                ? 'bg-purple-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Join Campaign
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          /* Join Campaign */
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-1">Campaign Code</label>
              <input
                type="text"
                value={campaignCode}
                onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none text-center text-2xl tracking-widest font-mono"
                placeholder="Enter code"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
            >
              Join Campaign
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          AI-powered storytelling for your D&D adventures
        </div>
      </div>
    </div>
  );
}
