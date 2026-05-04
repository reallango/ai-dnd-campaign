'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

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
  const router = useRouter();
  const code = params.code as string;
  const playerName = searchParams.get('name') || '';
  
  const [step, setStep] = useState<'character-select' | 'create-mode' | 'create-wizard' | 'create-review' | 'playing'>('character-select');
  const [createMode, setCreateMode] = useState<'random' | 'guided' | 'manual'>('manual');
  const [wizardStep, setWizardStep] = useState(1);
  
  // Character data
  const [characterName, setCharacterName] = useState('');
  const [characterRace, setCharacterRace] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [characterBackground, setCharacterBackground] = useState('');
  const [abilityScores, setAbilityScores] = useState({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 });
  const [skills, setSkills] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState('');
  const [ideals, setIdeals] = useState('');
  const [bonds, setBonds] = useState('');
  const [flaws, setFlaws] = useState('');
  const [backstory, setBackstory] = useState('');
  
  // AI generation
  const [generating, setGenerating] = useState(false);
  const [generatedCharacter, setGeneratedCharacter] = useState<any>(null);
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
                onClick={() => setStep('create-mode')}
                className="btn btn-secondary w-full"
              >
                Create New Character
              </button>
            </div>
          </div>
        )}

        {/* Character Creation - Mode Selection */}
        {step === 'create-mode' && (
          <div className="card animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">✨</span> Create New Character
            </div>
            <div className="flex flex-col gap-md">
              <p className="text-secondary mb-md">
                Choose how you want to create your character:
              </p>
              
              {/* Random AI */}
              <button
                onClick={async () => {
                  setCreateMode('random');
                  setGenerating(true);
                  try {
                    const res = await fetch('/api/character-generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ mode: 'random' })
                    });
                    const data = await res.json();
                    if (data.character) {
                      setGeneratedCharacter(data.character);
                      setStep('create-review');
                    }
                  } catch (e) {
                    setError('Failed to generate character');
                  } finally {
                    setGenerating(false);
                  }
                }}
                disabled={generating}
                className="choice-option text-left"
              >
                <div className="text-gold text-lg">🎲 Random Generation</div>
                <div className="text-muted text-sm">
                  Let AI create a completely random character for you
                </div>
              </button>
              
              {/* Guided AI */}
              <button
                onClick={() => {
                  setCreateMode('guided');
                  setStep('create-wizard');
                }}
                className="choice-option text-left"
              >
                <div className="text-gold text-lg">🧙 Guided Generation</div>
                <div className="text-muted text-sm">
                  Answer a few questions, AI fills in the rest
                </div>
              </button>
              
              {/* Manual */}
              <button
                onClick={() => {
                  setCreateMode('manual');
                  setStep('create-wizard');
                }}
                className="choice-option text-left"
              >
                <div className="text-gold text-lg">✏️ Manual Creation</div>
                <div className="text-muted text-sm">
                  Fill out the character sheet yourself (use built-in dice roller)
                </div>
              </button>
              
              <button
                onClick={() => setStep('character-select')}
                className="btn btn-secondary w-full mt-md"
              >
                Back
              </button>
            </div>
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