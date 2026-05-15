'use client';

import { useState, useEffect } from 'react';
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
  let narrative = content;
  let choices: string[] = [];
  
  // Try to extract [NARRATIVE]...[/NARRATIVE] (closing tag optional)
  const narrativeMatch = content.match(/\[NARRATIVE\]([\s\S]*?)(?:\[\/NARRATIVE\]|\[CHOICES\]|$)/);
  if (narrativeMatch) {
    narrative = narrativeMatch[1].trim();
  }
  
  // Try to extract [CHOICES]...[/CHOICES] (closing tag optional)
  const choicesMatch = content.match(/\[CHOICES\]([\s\S]*?)(?:\[\/CHOICES\]|$)/);
  if (choicesMatch) {
    choices = choicesMatch[1].trim().split('\n')
      .map(c => c.trim())
      .filter(c => c.match(/^[A-Z]\./))
      .map(c => c.replace(/^[A-Z]\.\s*/, ''));
  }
  
  // If no [NARRATIVE] tag, strip any [CHOICES] block from the narrative
  if (!narrativeMatch && choicesMatch) {
    narrative = content.replace(/\[CHOICES\][\s\S]*$/, '').trim();
  }
  
  // Fallback: look for A., B., C., D. patterns at end of content
  if (choices.length === 0) {
    const lines = content.split('\n');
    const choiceLines: string[] = [];
    const narrativeLines: string[] = [];
    let inChoices = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[A-D]\.\s/) || trimmed.match(/^\d+\.\s/)) {
        inChoices = true;
        choiceLines.push(trimmed.replace(/^[A-D]\.\s*/, '').replace(/^\d+\.\s*/, ''));
      } else if (!inChoices) {
        narrativeLines.push(line);
      }
    }
    
    if (choiceLines.length > 0) {
      narrative = narrativeLines.join('\n').trim();
      choices = choiceLines;
    }
  }
  
  // Clean any remaining tags from narrative
  narrative = narrative
    .replace(/\[NARRATIVE\]/g, '')
    .replace(/\[\/NARRATIVE\]/g, '')
    .replace(/\[CHOICES\]/g, '')
    .replace(/\[\/CHOICES\]/g, '')
    .trim();
  
  return { narrative, choices };
}

export default function OneShotGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [narratives, setNarratives] = useState<NarrativeEntry[]>([]);
  const [currentNarrative, setCurrentNarrative] = useState('');
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [lastDice, setLastDice] = useState<{ dice: string; result: number } | null>(null);
  
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; provider: string }>({ available: false, provider: '' });
  const [error, setError] = useState('');
  
  const [diceInput, setDiceInput] = useState('1d20');
  const [diceLabel, setDiceLabel] = useState('');
  const [showDiceResult, setShowDiceResult] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'character' | 'inventory' | 'log'>('character');
  const [expandedLogEntry, setExpandedLogEntry] = useState<number | null>(null);
  
  const hasOpening = narratives.length > 0;
  
  useEffect(() => {
    loadCampaignData();
  }, [code]);
  
  const loadCampaignData = async () => {
    try {
      const campaignRes = await fetch(`/api/campaigns/${code}`);
      const campaignData = await campaignRes.json();
      if (!campaignData.campaign) {
        setError('Campaign not found');
        return;
      }
      setCampaign(campaignData.campaign);
      const campaignId = campaignData.campaign.id;
      
      const aiRes = await fetch('/api/ai');
      const aiData = await aiRes.json();
      setAiStatus(aiData);
      
      const playersRes = await fetch(`/api/players?campaignId=${campaignId}`);
      const playersData = await playersRes.json();
      if (playersData.players && playersData.players.length > 0) {
        setPlayer(playersData.players[0]);
      }
      
      const narrativesRes = await fetch(`/api/narratives/${campaignId}`);
      const narrativesData = await narrativesRes.json();
      if (narrativesData.narratives) {
        setNarratives(narrativesData.narratives);
      }
      
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
      let promptText = '';
      
      if (campaign.name.startsWith('Mystery') || campaign.name.startsWith('Surprise')) {
        promptText = `Begin a new D&D one-shot adventure. Choose a creative and unexpected theme that will surprise the player. Make it unique and memorable. The player character is ${player.name}, a level ${player.level || 1} ${player.race} ${player.class} with background ${player.background}.

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
        promptText = `Begin a new D&D one-shot adventure based on the player's request: ${themeDesc}. Build a world and scenario around this concept. The player character is ${player.name}, a level ${player.level || 1} ${player.race} ${player.class} with background ${player.background}.

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
        promptText = `Begin a new D&D one-shot adventure. The theme is: ${themeDesc}. The player character is ${player.name}, a level ${player.level || 1} ${player.race} ${player.class} with background ${player.background}.

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
        body: JSON.stringify({ prompt: promptText, type: 'narrative', campaignId: campaign.id }),
      });
      
      const data = await response.json();
      
      if (data.content) {
        const parsed = parseAIResponse(data.content);
        setCurrentNarrative(parsed.narrative);
        setCurrentChoices(parsed.choices);
        
        const saveRes = await fetch(`/api/narratives/${campaign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai',
            content: parsed.narrative,
            metadata: { fullResponse: data.content, choices: parsed.choices },
          }),
        });
        const saved = await saveRes.json();
        if (saved.narrative) {
          setNarratives(prev => [saved.narrative, ...prev]);
        }
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
      await fetch(`/api/narratives/${campaign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'player_action',
          content: choice,
          metadata: { playerName: player.name, characterName: player.character_name },
        }),
      });
      
      setCurrentChoices([]);
      
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
        const parsed = parseAIResponse(data.content);
        setCurrentNarrative(parsed.narrative);
        setCurrentChoices(parsed.choices);
        
        const saveRes = await fetch(`/api/narratives/${campaign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai',
            content: parsed.narrative,
            metadata: { fullResponse: data.content, choices: parsed.choices },
          }),
        });
        const saved = await saveRes.json();
        if (saved.narrative) {
          setNarratives(prev => [saved.narrative, ...prev]);
        }
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
      setCurrentChoices([]);
      
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
        const parsed = parseAIResponse(data.content);
        setCurrentNarrative(parsed.narrative);
        setCurrentChoices(parsed.choices);
        
        const saveRes = await fetch(`/api/narratives/${campaign.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai',
            content: parsed.narrative,
            metadata: { fullResponse: data.content, choices: parsed.choices },
          }),
        });
        const saved = await saveRes.json();
        if (saved.narrative) {
          setNarratives(prev => [saved.narrative, ...prev]);
        }
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
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 gap-4">
        {/* Begin Adventure Button (when no opening) */}
        {!hasOpening && !loading && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
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
        
        {/* Loading State */}
        {loading && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <div className="loading-spinner mx-auto mb-2" />
            <p className="text-slate-400">The Dungeon Master is thinking...</p>
          </div>
        )}
        
        {/* Current Scene (always visible after adventure starts) */}
        {hasOpening && currentNarrative && !loading && (
          <div className="bg-slate-800 rounded-lg border-2 border-slate-600 p-6">
            <h2 className="text-gold font-semibold text-lg mb-4">📜 Current Scene</h2>
            <div className="text-slate-200 text-lg whitespace-pre-wrap leading-relaxed">
              {currentNarrative}
            </div>
          </div>
        )}
        
        {/* Choices (if available, always visible after adventure starts) */}
        {hasOpening && currentChoices.length > 0 && !loading && (
          <div className="space-y-3">
            <p className="text-gold font-semibold">Choose an action:</p>
            {currentChoices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleChoice(choice)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 bg-slate-800 border-2 border-slate-600 rounded-lg hover:border-amber-500 hover:bg-slate-700 transition-all disabled:opacity-50 text-left group"
              >
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-600 text-white font-bold text-sm shrink-0 group-hover:bg-amber-500">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-slate-200 group-hover:text-white">{choice}</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Free Text Input (ALWAYS visible after adventure starts) */}
        {hasOpening && (
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-gold font-semibold mb-2">Or describe your own action:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomAction()}
                placeholder="What do you do? (e.g., 'I search the room for hidden doors')"
                className="flex-1 bg-slate-900 text-white p-3 rounded border border-slate-700 focus:border-amber-500 outline-none"
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
        
        {error && <p className="text-red-400 text-center">{error}</p>}
        
        {/* Dice Roller */}
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-4 flex-wrap">
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
              onClick={() => setActiveTab('log')}
              className={`flex-1 p-3 text-center ${activeTab === 'log' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              📜 Adventure Log
            </button>
          </div>
          
          <div className="p-4 max-h-64 overflow-y-auto">
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
            {activeTab === 'log' && (
              <div className="space-y-0">
                {narratives.map((entry) => (
                  <div key={entry.id} className="border-b border-slate-700 last:border-b-0">
                    <button
                      onClick={() => setExpandedLogEntry(
                        expandedLogEntry === entry.id ? null : entry.id
                      )}
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-700/50"
                    >
                      <span>{entry.type === 'player_action' ? '⚔️' : '📜'}</span>
                      <span className="flex-1 text-slate-300 truncate text-sm">
                        {entry.content.replace(/\[NARRATIVE\]|\[\/NARRATIVE\]|\[CHOICES\][\s\S]*/g, '').substring(0, 60)}...
                      </span>
                      <span className="text-slate-500 text-xs">
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </span>
                      <span className="text-slate-500">
                        {expandedLogEntry === entry.id ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedLogEntry === entry.id && (
                      <div className="px-4 pb-3 text-slate-300 text-sm whitespace-pre-wrap">
                        {entry.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-1">{line}</p>
                        ))}
                      </div>
                    )}
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