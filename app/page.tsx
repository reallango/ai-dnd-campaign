'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [campaignName, setCampaignName] = useState('');
  const [dmName, setDmName] = useState('');
  const [campaignCode, setCampaignCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, dm_name: dmName }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign');
      }
      
      router.push(`/dm/${data.campaign.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // First verify campaign exists
      const response = await fetch(`/api/campaigns/${campaignCode.toUpperCase()}`);
      
      if (!response.ok) {
        throw new Error('Campaign not found');
      }
      
      const data = await response.json();
      router.push(`/player/${data.campaign.code}?name=${encodeURIComponent(playerName)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-md">
      <div className="container">
        {/* Logo/Title */}
        <div className="text-center mb-lg animate-slide-up">
          <div className="ornament justify-center mb-md">
            <span>Campaigned</span>
          </div>
          <h1 className="text-gold mb-sm">AI D&D Campaign Manager</h1>
          <p className="text-secondary">
            Run immersive AI-assisted tabletop adventures for 1-10 players
          </p>
        </div>

        {/* Choice Cards */}
        {mode === 'choice' && (
          <div className="grid grid-2 gap-lg max-w-3xl mx-auto">
            <button
              onClick={() => setMode('create')}
              className="card card-create animate-slide-up stagger-1"
              style={{ cursor: 'pointer', textAlign: 'left' }}
            >
              <div className="card-header">
                <span className="text-gold">⚔️</span> Create Campaign
              </div>
              <p className="text-secondary">
                Start a new adventure as the Dungeon Master. Create a campaign and invite players to join.
              </p>
              <div className="mt-md text-gold">Begin New Campaign →</div>
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="card card-join animate-slide-up stagger-2"
              style={{ cursor: 'pointer', textAlign: 'left' }}
            >
              <div className="card-header">
                <span className="text-gold">🛡️</span> Join Campaign
              </div>
              <p className="text-secondary">
                Enter a campaign code to join an existing adventure as a player.
              </p>
              <div className="mt-md text-gold">Enter Campaign →</div>
            </button>
          </div>
        )}

        {/* Create Campaign Form */}
        {mode === 'create' && (
          <div className="card animate-slide-up" style={{ maxWidth: '450px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">⚔️</span> Create New Campaign
            </div>
            
            <form onSubmit={handleCreateCampaign}>
              <div className="flex flex-col gap-md">
                <div>
                  <label className="block text-secondary mb-sm">Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="The Lost Mines of Phandelver"
                    className="w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-secondary mb-sm">Your Name (DM)</label>
                  <input
                    type="text"
                    value={dmName}
                    onChange={(e) => setDmName(e.target.value)}
                    placeholder="Dungeon Master"
                    className="w-full"
                  />
                </div>
                
                {error && (
                  <div className="text-crimson text-center">{error}</div>
                )}
                
                <div className="flex gap-md mt-md">
                  <button
                    type="button"
                    onClick={() => setMode('choice')}
                    className="btn btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Join Campaign Form */}
        {mode === 'join' && (
          <div className="card animate-slide-up" style={{ maxWidth: '450px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">🛡️</span> Join Campaign
            </div>
            
            <form onSubmit={handleJoinCampaign}>
              <div className="flex flex-col gap-md">
                <div>
                  <label className="block text-secondary mb-sm">Campaign Code *</label>
                  <input
                    type="text"
                    value={campaignCode}
                    onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="w-full text-center"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.2em' }}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-secondary mb-sm">Your Character Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Grom the Brave"
                    className="w-full"
                    required
                  />
                </div>
                
                {error && (
                  <div className="text-crimson text-center">{error}</div>
                )}
                
                <div className="flex gap-md mt-md">
                  <button
                    type="button"
                    onClick={() => setMode('choice')}
                    className="btn btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary flex-1"
                  >
                    {loading ? 'Joining...' : 'Join Campaign'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <p className="text-muted">
            AI D&D Campaign Manager • Self-hosted • Free and Open Source
          </p>
        </footer>
      </div>
    </main>
  );
}
