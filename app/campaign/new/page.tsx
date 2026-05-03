'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gameSystem, setGameSystem] = useState('dnd5e');
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.user) {
      router.push('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, game_system: gameSystem, is_shared: isShared }),
      });

      const data = await response.json();

      if (response.ok && data.campaign) {
        router.push(`/dm/${data.campaign.code}`);
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch (e) {
      setError('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-400 hover:text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Create New Campaign</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm mb-1">Campaign Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="Enter campaign name"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1">Game System</label>
            <select
              value={gameSystem}
              onChange={(e) => setGameSystem(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="dnd5e">D&D 5th Edition</option>
              <option value="pathfinder2e">Pathfinder 2nd Edition</option>
              <option value="callofcthulhu">Call of Cthulhu</option>
              <option value="savageworlds">Savage Worlds</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isShared"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-5 h-5 bg-slate-800 border border-slate-600 rounded"
            />
            <label htmlFor="isShared" className="text-slate-300">
              Share with other GMs (make this campaign visible to other registered Game Masters)
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        </form>
      </main>
    </div>
  );
}