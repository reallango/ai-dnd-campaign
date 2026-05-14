'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
  race?: string;
  background?: string;
  level?: number;
}

interface NarrativeEntry {
  id: number;
  type: string;
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface DiceRoll {
  id: number;
  dice: string;
  result: number;
  breakdown: string;
}

// Parse AI response to extract narrative and choices
function parseAIResponse(content: string): { narrative: string; choices: string[] } {
  const narrativeMatch = content.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/);
  const choicesMatch = content.match(/\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/);
  
  let narrative = narrativeMatch ? narrativeMatch[1].trim() : content;
  let choices: string[] = [];
  
  if (choicesMatch) {
    choices = choicesMatch[1].trim().split('\n')
      .map(c => c.trim())
      .filter(c => c.match(/^[A-Z]\./))
      .map(c => c.replace(/^[A-Z]\.\s*/, ''));
  }
  
  // Fallback: if no tags found, try to split on common patterns
  if (!narrativeMatch && !choicesMatch) {
    const lines = content.split('\n');
    const choiceLines: string[] = [];
    const narrativeLines: string[] = [];
    let inChoices = false;
    
    for (const line of lines) {
      if (line.trim().match(/^[A-D]\.\s/)) {
        inChoices = true;
        choiceLines.push(line.trim().replace(/^[A-D]\.\s*/, ''));
      } else if (!inChoices) {
        narrativeLines.push(line);
      }
    }
    
    if (choiceLines.length > 0) {
      narrative = narrativeLines.join('\n').trim();
      choices = choiceLines;
    }
  }
  
  return { narrative, choices };
}

export default function OneShotGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [narratives, setNarratives] = useState<NarrativeEntry[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [lastDice, setLastDice] = useState<{ dice: string; result: number } | null>(null);
  
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; provider: string }>({ available: false, provider: '' });
  const [error, setError] = useState('');
  
  const [diceInput, setDiceInput] = useState('1d20');
  const [diceLabel, setDiceLabel] = useState('');
  const [showDiceResult, setShowDiceResult] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'character' | 'inventory' | 'story'>('character');
  
  const narrativesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadCampaignData();
  }, [code]);
  
  useEffect(() => {
    // Scroll to bottom when narratives change
    if (narrativesEndRef.current) {
      narrativesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [narratives]);
  
  const loadCampaignData = async () => {
    try {
      // Load campaign
      const campaignRes = await fetch(`/api/campaigns/${code}`);
      const campaignData = await campaignRes.json();
      if (!campaignData.campaign) {
        setError('Campaign not found');
        return;
      }
      setCampaign(campaignData.campaign);
      const campaignId = campaignData.campaign.id;
      
      // Load AI status
      const aiRes = await fetch('/api/ai');
      const aiData = await aiRes.json();
      setAiStatus(aiData);
      
      // Load player
      const playersRes = await fetch(`/api/players?campaignId=${campaignId}`);
      const playersData = await playersRes.json();
      if (playersData.players && playersData.players.length > 0) {
        setPlayer(playersData.players[0]);
      }
      
      // Load narratives
      const narrativesRes = await fetch(`/api/narratives/${campaignId}`);
      const narrativesData = await narrativesRes.json();
      if (narrativesData.narratives) {
        setNarratives(narrativesData.narratives);
      }
      
      // Load dice rolls
      const diceRes = await fetch(`/api/dice?campaignId=${campaignId}&limit=20`);
      const diceData = await diceRes.json();
      if (diceData.rolls) {
        setDiceRolls(diceData.rolls);
      }
    } catch (err) {
      console.error('Error loading campaign:', err);
      setError('Failed to load campaign');
    }
  };
  
  const generateOpeningScene = async () => {
    if (!campaign || !player) return;
    
    setLoading(true);
    setError('');
    
    try {
      const themeDesc = campaign.description || 'A solo adventure';
      let prompt = '';
      
      if (campaign.name.startsWith('Mystery') || campaign.name.startsWith('Surprise')) {
        prompt = `Begin a new D&D one-shot adventure. Choose a creative and unexpected theme that will surprise the player. Make it unique and memorable. The player character is ${player.name}, a level ${player.level || 1} ${player.race} ${player.class} with background ${player.background}.

Generate an immersive opening scene that:
1. Sets the atmosphere and location
2. Introduces an immediate hook or situation
3. Ends with 3 choices for the player

Format your response as:
[NARRATIVE]
Your narrative text here...
[/NARRATIVE]
[CHOICES]
A. First choice
B. Second choice
C. Third choice
[/CHOICES]`;
      } else if (campaign.name.startsWith('Custom')) {
        prompt = `Begin a new D&D one-shot adventure based on the player's request: ${themeDesc}. Build a world and scenario around this concept. The player character is ${player.name}, a level ${player.level || 1} ${player.race} ${player.class} with background ${player.background}.

Generate an immersive opening scene that:
1. Sets the atmosphere and location
2. Introduces an immediate hook or situation
3. Ends with 3 choices for the player

Format your response as:
[NARRATIVE]
Your narrative text here...
[/NARRATIVE]
[CHOICES]
A. First choice
B. Second choice
C. Third choice
[/CHOICES]`;
      } else {
        prompt = `Begin a new D&D one-shot adventure. The theme is: ${themeDesc}. The player character is ${player.name}, a level ${player.level || 1} ${player.race} ${player.class} with background ${player.background}.

Generate an immersive opening scene that:
1. Sets the atmosphere and location
2. Introduces an immediate hook or situation
3. Ends with 3 choices for the player

Format your response as:
[NARRATIVE]
Your narrative text here...
[/NARRATIVE]
[CHOICES]
A. First choice
B. Second choice
C. Third choice
[/CHOICES]`;
      }
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'narrative', campaignId: campaign.id }),
      });
      
      const data = await response.json();
      
      if (data.content) {
        // Save AI narrative
        const saveRes = await fetch(`/api/narratives/${campaign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai',
            content: data.content,
            metadata: { prompt },
          }),
        });
        const saved = await saveRes.json();
        if (saved.narrative) {
          setNarratives(prev => [saved.narrative, ...prev]);
        }
        
        // Parse and show choices
        const parsed = parseAIResponse(data.content);
        setChoices(parsed.choices);
      } else {
        setError(data.error || 'Failed to generate opening scene');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChoice = async (choice: string) => {
    if (!campaign || !player || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Save player action
      await fetch(`/api/narratives/${campaign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'player_action',
          content: choice,
          metadata: { playerName: player.name, characterName: player.character_name },
        }),
      });
      
      // Clear choices while processing
      setChoices([]);
      
      // Generate AI response
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `The player (${player.character_name || player.name}, level ${player.level || 1} ${player.race} ${player.class}) chose to: ${choice}.\n\nContinue the adventure. Describe what happens as a result of their action. Include any dice rolls needed (describe them narratively). If combat starts, describe the combat dramatically. If they meet an NPC, voice the NPC with personality.\n\nEnd with 2-4 new choices for the player.\n\nFormat:\n[NARRATIVE]\nYour narrative...\n[/NARRATIVE]\n[CHOICES]\nA. First choice\nB. Second choice\nC. Third choice\n[/CHOICES]`,
          type: 'narrative',
          campaignId: campaign.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.content) {
        // Save AI response
        const saveRes = await fetch(`/api/narratives/${campaign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai',
            content: data.content,
            metadata: {},
          }),
        });
        const saved = await saveRes.json();
        if (saved.narrative) {
          setNarratives(prev => [saved.narrative, ...prev]);
        }
        
        // Parse choices
        const parsed = parseAIResponse(data.content);
        setChoices(parsed.choices);
      } else {
        setError(data.error || 'Failed to continue adventure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCustomAction = async () => {
    if (!prompt.trim() || !campaign || !player || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Save player action
      await fetch(`/api/narratives/${campaign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'player_action',
          content: prompt,
          metadata: { playerName: player.name, characterName: player.character_name },
        }),
      });
      
      setPrompt('');
      setChoices([]);
      
      // Generate AI response
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `The player (${player.character_name || player.name}, level ${player.level || 1} ${player.race} ${player.class}) chose to do this: ${prompt}.\n\nContinue the adventure. Describe what happens as a result of their action. Include any dice rolls needed (describe them narratively). If combat starts, describe the combat dramatically. If they meet an NPC, voice the NPC with personality.\n\nEnd with 2-4 new choices for the player.\n\nFormat:\n[NARRATIVE]\nYour narrative...\n[/NARRATIVE]\n[CHOICES]\nA. First choice\nB. Second choice\nC. Third choice\n[/CHOICES]`,
          type: 'narrative',
          campaignId: campaign.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.content) {
        const saveRes = await fetch(`/api/narratives/${campaign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai',
            content: data.content,
            metadata: {},
          }),
        });
        const saved = await saveRes.json();
        if (saved.narrative) {
          setNarratives(prev => [saved.narrative, ...prev]);
        }
        
        const parsed = parseAIResponse(data.content);
        setChoices(parsed.choices);
      } else {
        setError(data.error || 'Failed to continue adventure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRollDice = async () => {
    if (!diceInput.trim() || !campaign) return;
    
    try {
      const response = await fetch('/api/dice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          dice: diceInput,
          label: diceLabel,
        }),
      });
      
      const data = await response.json();
      
      if (data.dice) {
        setLastDice(data.dice);
        setShowDiceResult(true);
        setTimeout(() => setShowDiceResult(false), 5000);
        setDiceRolls(prev => [data.dice, ...prev]);
      }
    } catch (err) {
      console.error('Dice error:', err);
    }
  };
  
  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }
  
  // Generate opening scene if none exist
  const hasOpening = narratives.some(n => n.type === 'ai');
  
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <h1 className="text-gold font-bold">{campaign.name}</h1>
            <div className="text-slate-400 text-sm">
              {player?.character_name || player?.name} {player ? `Lv${player.level || 1}` : ''} {player ? `${player.race} ${player.class}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-sm">
              <div className={`w-2 h-2 rounded-full ${aiStatus.available ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted text-sm">{aiStatus.provider || 'AI'}</span>
            </div>
            <button onClick={() => router.push('/dashboard')} className="btn btn-secondary text-sm">
              Exit
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Game Area */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        {/* Narrative Log */}
        <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col mb-4">
          <div className="p-3 bg-slate-900 border-b border-slate-700">
            <h2 className="text-gold font-semibold">📜 Adventure Log</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasOpening && !loading && (
              <div className="text-center py-8">
                <button
                  onClick={generateOpeningScene}
                  disabled={!aiStatus.available}
                  className="btn btn-primary text-lg py-3 px-8 disabled:opacity-50"
                >
                  {aiStatus.available ? '⚔️ Begin Adventure' : 'AI not available'}
                </button>
                {!aiStatus.available && (
                  <p className="text-slate-400 mt-2">Configure AI in admin settings</p>
                )}
              </div>
            )}
            
            {loading && (
              <div className="text-center py-4">
                <div className="loading-spinner mx-auto mb-2" />
                <p className="text-slate-400">The Dungeon Master is thinking...</p>
              </div>
            )}
            
            {narratives.map((entry) => (
              <div
                key={entry.id}
                className={`narrative-box ${
                  entry.type === 'player_action'
                    ? 'border-l-4 border-l-blue-500 bg-blue-900/20'
                    : 'bg-tertiary'
                }`}
              >
                {entry.type === 'player_action' && entry.metadata?.characterName && (
                  <div className="text-blue-400 text-sm font-semibold mb-1">
                    {entry.metadata.characterName}:
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  {entry.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-1">{line}</p>
                  ))}
                </div>
              </div>
            ))}
            
            <div ref={narrativesEndRef} />
          </div>
        </div>
        
        {/* Choices or Custom Action Input */}
        {(choices.length > 0 || !hasOpening) && (
          <div className="mb-4">
            {choices.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-gold font-semibold">What do you do?</p>
                {choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoice(choice)}
                    disabled={loading}
                    className="choice-option w-full text-left"
                  >
                    {String.fromCharCode(65 + index)}. {choice}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomAction()}
                placeholder="Or describe your own action..."
                className="flex-1 bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-amber-500 outline-none"
                disabled={loading}
              />
              <button
                onClick={handleCustomAction}
                disabled={!prompt.trim() || loading}
                className="btn btn-primary px-6 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
        
        {error && <p className="text-red-400 text-center mb-4">{error}</p>}
        
        {/* Dice Roller */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-gold font-semibold">🎲 Dice:</span>
            <input
              type="text"
              value={diceInput}
              onChange={(e) => setDiceInput(e.target.value)}
              placeholder="1d20"
              className="w-20 bg-slate-900 text-white text-center p-2 rounded border border-slate-700"
            />
            <button onClick={handleRollDice} className="dice-btn">Roll</button>
            {showDiceResult && lastDice && (
              <span className="text-gold font-display text-xl">
                {lastDice.result} ({lastDice.dice})
              </span>
            )}
          </div>
        </div>
        
        {/* Bottom Tabs */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('character')}
              className={`flex-1 p-3 text-center ${activeTab === 'character' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              📋 Character
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 p-3 text-center ${activeTab === 'inventory' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              🎒 Inventory
            </button>
            <button
              onClick={() => setActiveTab('story')}
              className={`flex-1 p-3 text-center ${activeTab === 'story' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              📖 Story So Far
            </button>
          </div>
          
          <div className="p-4">
            {activeTab === 'character' && player && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white ml-2">{player.character_name || player.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Level:</span>
                    <span className="text-white ml-2">{player.level || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Race:</span>
                    <span className="text-white ml-2">{player.race}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Class:</span>
                    <span className="text-white ml-2">{player.class}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Background:</span>
                    <span className="text-white ml-2">{player.background}</span>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'character' && !player && (
              <p className="text-slate-400">No character loaded</p>
            )}
            {activeTab === 'inventory' && (
              <p className="text-slate-400">Inventory tracking coming soon</p>
            )}
            {activeTab === 'story' && (
              <div className="text-slate-300 text-sm space-y-2 max-h-64 overflow-y-auto">
                {narratives.slice().reverse().map((entry) => (
                  <div key={entry.id} className="border-b border-slate-700 pb-2">
                    <span className="text-slate-500">{entry.type === 'player_action' ? '→' : '📜'}</span>{' '}
                    {entry.content.substring(0, 200)}
                    {entry.content.length > 200 && '...'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}