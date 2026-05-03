'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

interface Campaign {
  id: number;
  code: string;
  name: string;
  description: string;
  dm_name: string;
}

interface Player {
  id: number;
  name: string;
  character_name?: string;
  class?: string;
  is_connected: number;
}

interface NarrativeEntry {
  id: number;
  type: string;
  content: string;
  created_at: string;
}

interface DiceRoll {
  id: number;
  dice: string;
  result: number;
  breakdown: string;
  player_name?: string;
}

export default function DMDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [narratives, setNarratives] = useState<NarrativeEntry[]>([]);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  
  const [activeTab, setActiveTab] = useState<'narrative' | 'combat' | 'players' | 'settings'>('narrative');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; provider: string; error?: string }>({ available: false, provider: '' });
  const [aiError, setAiError] = useState('');
  
  const [diceInput, setDiceInput] = useState('1d20');
  const [diceLabel, setDiceLabel] = useState('');
  const [diceResult, setDiceResult] = useState<{ dice: string; result: number; breakdown: string } | null>(null);
  const [showDiceResult, setShowDiceResult] = useState(false);
  
  const [mapUrl, setMapUrl] = useState('');
  
  // Load initial data
  const loadCampaignData = useCallback(async () => {
    try {
      const [campaignRes, playersRes, diceRes, aiRes] = await Promise.all([
        fetch(`https://gm-assist.intisive.com/api/campaigns/${code}`),
        fetch(`https://gm-assist.intisive.com/api/players?campaignId=`),
        fetch(`https://gm-assist.intisive.com/api/dice?campaignId=&limit=20`),
        fetch(`https://gm-assist.intisive.com/api/ai`),
      ]);
      
      const campaignData = await campaignRes.json();
      if (campaignData.campaign) setCampaign(campaignData.campaign);
      
      const playersData = await playersRes.json();
      if (playersData.players) setPlayers(playersData.players);
      
      const diceData = await diceRes.json();
      if (diceData.rolls) setDiceRolls(diceData.rolls);
      
      const aiData = await aiRes.json();
      setAiStatus(aiData);
    } catch (err) {
      console.error('Error loading campaign:', err);
    }
  }, [code]);

  useEffect(() => {
    loadCampaignData();
    const interval = setInterval(loadCampaignData, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, [loadCampaignData]);

  const handleGenerateNarrative = async () => {
    if (!prompt.trim() || generating) return;
    
    // Check AI availability first
    if (!aiStatus.available) {
      setAiError('AI is not configured. Go to /admin to set up AI connection.');
      return;
    }
    
    setGenerating(true);
    setAiError('');
    try {
      const response = await fetch('https://gm-assist.intisive.com/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          type: 'narrative'
        }),
      });
      
      const data = await response.json();
      
      console.log('AI response:', response.status, data);
      
      if (data.content) {
        setNarratives(prev => [{
          id: Date.now(),
          type: 'ai',
          content: data.content,
          created_at: new Date().toISOString()
        }, ...prev]);
        setPrompt('');
      } else if (data.error) {
        setAiError(data.error);
      } else {
        setAiError('Empty response from AI');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleRollDice = async () => {
    if (!diceInput.trim()) return;
    
    try {
      const response = await fetch('https://gm-assist.intisive.com/api/dice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign?.id,
          dice: diceInput,
          label: diceLabel,
        }),
      });
      
      const data = await response.json();
      
      if (data.dice) {
        setDiceResult(data.dice);
        setShowDiceResult(true);
        setTimeout(() => setShowDiceResult(false), 5000);
        setDiceRolls(prev => [data.dice, ...prev]);
      }
    } catch (err) {
      console.error('Dice error:', err);
    }
  };

  if (!campaign) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-tertiary border-b border-border p-md">
        <div className="container flex items-center justify-between">
          <div>
            <h2 className="text-gold mb-xs">{campaign.name}</h2>
            <div className="flex items-center gap-md text-secondary">
              <span>Campaign Code:</span>
              <span className="campaign-code">{campaign.code}</span>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-sm">
              <div className={`w-2 h-2 rounded-full ${aiStatus.available ? 'bg-success' : 'bg-error'}`} />
              <span className="text-muted text-sm">{aiStatus.provider || 'AI'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tabs container mt-md" style={{ maxWidth: '800px' }}>
        <button 
          className={`tab ${activeTab === 'narrative' ? 'active' : ''}`}
          onClick={() => setActiveTab('narrative')}
        >
          🗡️ Narrative
        </button>
        <button 
          className={`tab ${activeTab === 'combat' ? 'active' : ''}`}
          onClick={() => setActiveTab('combat')}
        >
          ⚔️ Combat
        </button>
        <button 
          className={`tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          🛡️ Players ({players.length})
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Content */}
      <div className="container flex-1 py-lg" style={{ maxWidth: '1000px' }}>
        
        {/* Narrative Tab */}
        {activeTab === 'narrative' && (
          <div className="grid gap-lg" style={{ gridTemplateColumns: '2fr 1fr' }}>
            {/* Main Narrative Area */}
            <div className="flex flex-col gap-md">
              {/* Map Display */}
              {mapUrl && (
                <div className="card">
                  <div className="card-header">🗺️ Current Location</div>
                  <img src={mapUrl} alt="Map" className="w-full rounded" />
                </div>
              )}
              
              {/* Narrative Log */}
              <div className="card flex-1">
                <div className="card-header">📜 Narrative</div>
                <div className="flex flex-col gap-md" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {narratives.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📜</div>
                      <p>No narrative yet. Describe a scene to begin the adventure.</p>
                    </div>
                  ) : (
                    narratives.map((entry) => (
                      <div key={entry.id} className="narrative-box">
                        {entry.content}
                      </div>
                    ))
                  )}
                </div>
                
                {/* Generate Button */}
                <div className="mt-md flex gap-md">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what happens (e.g., 'The party enters a dark cave, they hear dripping water...')"
                    className="w-full"
                    rows={3}
                  />
                </div>
                <div className="mt-md">
                  <button
                    onClick={handleGenerateNarrative}
                    disabled={generating || !aiStatus.available}
                    className="btn btn-primary w-full"
                  >
                    {generating ? '✨ Generating...' : '✨ Generate Narrative'}
                  </button>
                  {aiError && <div className="text-crimson text-center mt-sm">{aiError}</div>}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-md">
              {/* Dice Roller */}
              <div className="card">
                <div className="card-header">🎲 Dice Roller</div>
                <div className="flex flex-col gap-sm">
                  <input
                    type="text"
                    value={diceInput}
                    onChange={(e) => setDiceInput(e.target.value)}
                    placeholder="1d20"
                    className="w-full text-center"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}
                  />
                  <input
                    type="text"
                    value={diceLabel}
                    onChange={(e) => setDiceLabel(e.target.value)}
                    placeholder="Roll for..."
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-sm justify-center">
                    {[4, 6, 8, 10, 12, 20].map(sides => (
                      <button
                        key={sides}
                        onClick={() => setDiceInput(`1d${sides}`)}
                        className={`dice-btn ${diceInput === `1d${sides}` ? 'selected' : ''}`}
                        data-sides={sides}
                      >
                        d{sides}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleRollDice} className="btn btn-primary w-full">
                    Roll
                  </button>
                  
                  {showDiceResult && diceResult && (
                    <div className="dice-result text-center p-md bg-tertiary rounded">
                      <div className="text-gold text-2xl font-display">{diceResult.result}</div>
                      <div className="text-muted">{diceResult.breakdown}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Dice Rolls */}
              <div className="card">
                <div className="card-header">📊 Recent Rolls</div>
                <div className="flex flex-col gap-sm" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {diceRolls.slice(0, 10).map(roll => (
                    <div key={roll.id} className="flex justify-between text-sm">
                      <span className="text-muted">{roll.dice}</span>
                      <span className="text-gold font-display">{roll.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Combat Tab */}
        {activeTab === 'combat' && (
          <div className="card">
            <div className="card-header">⚔️ Combat Tracker</div>
            <p className="text-muted">Combat tracker will be available in Phase 2.</p>
            <div className="mt-md">
              <button className="btn btn-secondary">
                Start Combat Encounter
              </button>
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="card">
            <div className="card-header">🛡️ Players ({players.length}/10)</div>
            {players.length === 0 ? (
              <div className="empty-state">
                <p>No players have joined yet. Share the campaign code: <span className="campaign-code">{campaign.code}</span></p>
              </div>
            ) : (
              <div className="grid grid-2 gap-md mt-md">
                {players.map(player => (
                  <div key={player.id} className="flex items-center gap-md p-sm bg-tertiary rounded">
                    <div className={`player-token ${player.is_connected ? 'connected' : ''}`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-gold">{player.name}</div>
                      <div className="text-muted text-sm">
                        {player.character_name || 'No character'}
                        {player.class && ` • ${player.class}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-md">
            <div className="card">
              <div className="card-header">🗺️ Map URL</div>
              <input
                type="url"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://example.com/map.jpg"
                className="w-full"
              />
              <p className="text-muted text-sm mt-sm">
                Enter a URL to an image to display as the current map.
              </p>
            </div>
            
            <div className="card">
              <div className="card-header">🤖 AI Configuration</div>
              <div className="flex items-center gap-md">
                <div className={`w-3 h-3 rounded-full ${aiStatus.available ? 'bg-success' : 'bg-error'}`} />
                <span>{aiStatus.available ? 'AI Connected' : 'AI Not Available'}</span>
              </div>
              <p className="text-muted text-sm mt-sm">
                Provider: {aiStatus.provider} {aiStatus.error && `• Error: ${aiStatus.error}`}
              </p>
              <p className="text-muted text-sm">
                Configure AI via environment variables: AI_PROVIDER, AI_API_KEY, AI_BASE_URL, AI_MODEL
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}