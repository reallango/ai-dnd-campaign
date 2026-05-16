'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GameSystem {
  id: number;
  name: string;
  short_name: string;
  description: string;
  icon: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<'system' | 'details'>('system');
  const [gameSystems, setGameSystems] = useState<GameSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
    loadGameSystems();
  }, []);

  const checkAuth = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.user) {
      router.push('/');
    }
  };

  const loadGameSystems = async () => {
    try {
      const res = await fetch('/api/game-systems?active_only=true');
      const data = await res.json();
      setGameSystems(data.systems || []);
    } catch (e) {
      console.error('Failed to load game systems:', e);
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
        body: JSON.stringify({ 
          name, 
          description, 
          game_system_id: selectedSystem,
          is_shared: isShared 
        }),
      });

      const data = await response.json();

      if (response.ok && data.campaign) {
        router.push(`/storyteller/${data.campaign.code}`);
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
            onClick={() => step === 'details' ? setStep('system') : router.push('/dashboard')}
            className="text-slate-400 hover:text-white"
          >
            {step === 'details' ? '← Back' : '← Back to Dashboard'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">
          {step === 'system' ? 'Choose a Game System' : 'Create New Campaign'}
        </h1>

        {step === 'system' ? (
          /* Game System Selection */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gameSystems.map(sys => (
              <button
                key={sys.id}
                onClick={() => { setSelectedSystem(sys.id); setStep('details'); }}
                className={`p-4 rounded-lg text-left transition-colors ${
                  selectedSystem === sys.id 
                    ? 'bg-purple-600 border-2 border-purple-500' 
                    : 'bg-slate-800 border-2 border-slate-700 hover:border-purple-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sys.icon || '🎮'}</span>
                  <div>
                    <h3 className="text-white font-semibold">{sys.name}</h3>
                    {sys.short_name && (
                      <p className="text-slate-400 text-sm">{sys.short_name}</p>
                    )}
                  </div>
                </div>
                {sys.description && (
                  <p className="text-slate-500 text-sm mt-2">{sys.description}</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          /* Campaign Details Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show selected system */}
            <div className="p-3 bg-slate-800 rounded-lg flex items-center gap-3">
              <span className="text-xl">
                {gameSystems.find(s => s.id === selectedSystem)?.icon || '🎮'}
              </span>
              <span className="text-white">
                {gameSystems.find(s => s.id === selectedSystem)?.name}
              </span>
              <button 
                type="button" 
                onClick={() => setStep('system')}
                className="ml-auto text-purple-400 text-sm hover:text-purple-300"
              >
                Change
              </button>
            </div>

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
        )}
      </main>
    </div>
  );
}