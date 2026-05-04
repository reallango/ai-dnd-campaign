'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface Campaign {
  id: number;
  code: string;
  name: string;
}

interface Character {
  id: number;
  name: string;
  race?: string;
  class?: string;
  level: number;
  background?: string;
}

interface NarrativeEntry {
  id: number;
  type: string;
  content: string;
  created_at: string;
}

export default function PlayerPortal() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const playerName = searchParams.get('name') || '';
  
  const [step, setStep] = useState<'character-select' | 'character-create' | 'playing'>('character-select');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  
  const [narratives, setNarratives] = useState<NarrativeEntry[]>([]);
  const [choices, setChoices] = useState<{ id: number; text: string }[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [choiceMade, setChoiceMade] = useState(false);
  
  const [diceInput, setDiceInput] = useState('1d20');
  const [diceLabel, setDiceLabel] = useState('');
  const [diceResult, setDiceResult] = useState<{ dice: string; result: number; breakdown: string } | null>(null);
  const [showDiceResult, setShowDiceResult] = useState(false);
  
  const [characterName, setCharacterName] = useState('');
  const [characterRace, setCharacterRace] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [characterBackground, setCharacterBackground] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load campaign and saved characters
  useEffect(() => {
    async function load() {
      try {
        const [campaignRes, charactersRes] = await Promise.all([
          fetch(`/api/campaigns/${code}`),
          fetch(`/api/characters`),
        ]);
        
        const campaignData = await campaignRes.json();
        if (campaignData.campaign) setCampaign(campaignData.campaign);
        
        const charactersData = await charactersRes.json();
        if (charactersData.characters) setSavedCharacters(charactersData.characters);
      } catch (err) {
        console.error('Error loading:', err);
      }
    }
    
    load();
  }, [code]);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setStep('playing');
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterName,
          race: characterRace,
          class: characterClass,
          background: characterBackground,
        }),
      });
      
      const data = await response.json();
      
      if (data.character) {
        setSelectedCharacter(data.character);
        setStep('playing');
      }
    } catch (err) {
      setError('Failed to create character');
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
          label: diceLabel || playerName,
        }),
      });
      
      const data = await response.json();
      
      if (data.dice) {
        setDiceResult(data.dice);
        setShowDiceResult(true);
        setTimeout(() => setShowDiceResult(false), 5000);
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
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gold mb-xs">{campaign.name}</h2>
              <p className="text-muted text-sm">
                Playing as: <span className="text-gold">{selectedCharacter?.name || playerName}</span>
                {selectedCharacter && (
                  <span> • Level {selectedCharacter.level} {selectedCharacter.race} {selectedCharacter.class}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/')} className="btn btn-secondary text-sm">
                ← Home
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container flex-1 py-lg">
        
        {/* Character Selection */}
        {step === 'character-select' && (
          <div className="card animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">🛡️</span> Choose Your Character
            </div>
            
            <div className="flex flex-col gap-md">
              <p className="text-secondary mb-md">
                Welcome, {playerName}! Select an existing character or create a new one.
              </p>
              
              {savedCharacters.length > 0 && (
                <div className="flex flex-col gap-sm">
                  <h4 className="text-muted">Saved Characters</h4>
                  {savedCharacters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => handleSelectCharacter(char)}
                      className="choice-option text-left"
                    >
                      <div className="text-gold font-display">{char.name}</div>
                      <div className="text-muted text-sm">
                        Level {char.level} {char.race} {char.class}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="divider" />
              
              <button
                onClick={() => setStep('character-create')}
                className="btn btn-secondary w-full"
              >
                Create New Character
              </button>
            </div>
          </div>
        )}

        {/* Character Creation */}
        {step === 'character-create' && (
          <div className="card animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">✨</span> Create New Character
            </div>
            
            <form onSubmit={handleCreateCharacter}>
              <div className="flex flex-col gap-md">
                <div>
                  <label className="block text-secondary mb-sm">Character Name *</label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Grom the Brave"
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="grid grid-2 gap-md">
                  <div>
                    <label className="block text-secondary mb-sm">Race</label>
                    <select
                      value={characterRace}
                      onChange={(e) => setCharacterRace(e.target.value)}
                      className="w-full"
                    >
                      <option value="">Select race...</option>
                      <option value="Human">Human</option>
                      <option value="Elf">Elf</option>
                      <option value="Dwarf">Dwarf</option>
                      <option value="Halfling">Halfling</option>
                      <option value="Dragonborn">Dragonborn</option>
                      <option value="Gnome">Gnome</option>
                      <option value="Half-Elf">Half-Elf</option>
                      <option value="Half-Orc">Half-Orc</option>
                      <option value="Tiefling">Tiefling</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-secondary mb-sm">Class</label>
                    <select
                      value={characterClass}
                      onChange={(e) => setCharacterClass(e.target.value)}
                      className="w-full"
                    >
                      <option value="">Select class...</option>
                      <option value="Fighter">Fighter</option>
                      <option value="Wizard">Wizard</option>
                      <option value="Rogue">Rogue</option>
                      <option value="Cleric">Cleric</option>
                      <option value="Paladin">Paladin</option>
                      <option value="Ranger">Ranger</option>
                      <option value="Bard">Bard</option>
                      <option value="Barbarian">Barbarian</option>
                      <option value="Druid">Druid</option>
                      <option value="Monk">Monk</option>
                      <option value="Sorcerer">Sorcerer</option>
                      <option value="Warlock">Warlock</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-secondary mb-sm">Background</label>
                  <textarea
                    value={characterBackground}
                    onChange={(e) => setCharacterBackground(e.target.value)}
                    placeholder="Acolyte, Criminal, Sage, Soldier..."
                    className="w-full"
                    rows={3}
                  />
                </div>
                
                {error && <div className="text-crimson">{error}</div>}
                
                <div className="flex gap-md">
                  <button
                    type="button"
                    onClick={() => setStep('character-select')}
                    className="btn btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Character'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Playing - Player View */}
        {step === 'playing' && (
          <div className="grid gap-lg" style={{ gridTemplateColumns: '1fr 300px' }}>
            {/* Main Narrative Area */}
            <div className="flex flex-col gap-md">
              <div className="card">
                <div className="card-header">📜 Current Scene</div>
                <div className="narrative-box">
                  {narratives.length === 0 ? (
                    <p className="text-muted">
                      Waiting for the Dungeon Master to describe the scene...
                    </p>
                  ) : (
                    narratives[0]?.content
                  )}
                </div>
              </div>
              
              {/* Choices */}
              {choices.length > 0 && !choiceMade && (
                <div className="card">
                  <div className="card-header">⚔️ What do you do?</div>
                  <div className="flex flex-col gap-sm">
                    {choices.map((choice, index) => (
                      <button
                        key={choice.id}
                        onClick={() => {
                          setSelectedChoice(choice.id);
                          setChoiceMade(true);
                        }}
                        className={`choice-option text-left ${selectedChoice === choice.id ? 'selected' : ''}`}
                      >
                        <span className="text-gold font-display">{String.fromCharCode(65 + index)}.</span> {choice.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {choiceMade && (
                <div className="badge badge-success">
                  ✓ Choice submitted - waiting for DM
                </div>
              )}
            </div>

            {/* Sidebar - Dice & Character */}
            <div className="flex flex-col gap-md">
              {/* Character Sheet */}
              <div className="card">
                <div className="card-header">📋 Character Sheet</div>
                <div className="flex flex-col gap-sm">
                  <div>
                    <span className="text-muted">Name:</span>{' '}
                    <span className="text-gold">{selectedCharacter?.name}</span>
                  </div>
                  {selectedCharacter?.race && (
                    <div>
                      <span className="text-muted">Race:</span>{' '}
                      {selectedCharacter.race}
                    </div>
                  )}
                  {selectedCharacter?.class && (
                    <div>
                      <span className="text-muted">Class:</span>{' '}
                      {selectedCharacter.class}
                    </div>
                  )}
                  {selectedCharacter?.level && (
                    <div>
                      <span className="text-muted">Level:</span>{' '}
                      {selectedCharacter.level}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Dice Roller */}
              <div className="card">
                <div className="card-header">🎲 Roll Dice</div>
                <div className="flex flex-col gap-sm">
                  <input
                    type="text"
                    value={diceInput}
                    onChange={(e) => setDiceInput(e.target.value)}
                    placeholder="1d20"
                    className="w-full text-center"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}
                  />
                  <div className="flex flex-wrap gap-sm justify-center">
                    {[4, 6, 8, 10, 12, 20].map(sides => (
                      <button
                        key={sides}
                        onClick={() => setDiceInput(`1d${sides}`)}
                        className="dice-btn"
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}