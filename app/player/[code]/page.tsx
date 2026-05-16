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
  
  // Game system
  const [gameSystemId, setGameSystemId] = useState<number | null>(null);
  const [races, setRaces] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [backgrounds, setBackgrounds] = useState<string[]>([]);

  // Load campaign and saved characters
  useEffect(() => {
    async function load() {
      try {
        // Load campaign first
        const campaignRes = await fetch(`/api/campaigns/${code}`);
        const campaignData: any = await campaignRes.json();
        
        if (campaignData.campaign) {
          setCampaign(campaignData.campaign);
          const gsid = campaignData.campaign.game_system_id;
          setGameSystemId(gsid || null);
          
          // Load catalog data if game system exists
          if (gsid) {
            loadCatalogData(gsid);
          }
        }
        
        // Load characters (filter by game system if available)
        const charUrl = campaignData.campaign?.game_system_id 
          ? `/api/characters?game_system_id=${campaignData.campaign.game_system_id}`
          : '/api/characters';
        const charactersRes = await fetch(charUrl);
        const charactersData = await charactersRes.json();
        if (charactersData.characters) setSavedCharacters(charactersData.characters);
      } catch (err) {
        console.error('Error loading:', err);
      }
    }
    
    load();
  }, [code]);

  const loadCatalogData = async (systemId: number) => {
    try {
      const [racesRes, classesRes, bgsRes] = await Promise.all([
        fetch(`/api/game-systems/${systemId}/data?category=races`),
        fetch(`/api/game-systems/${systemId}/data?category=classes`),
        fetch(`/api/game-systems/${systemId}/data?category=backgrounds`),
      ]);
      const racesData: any = await racesRes.json();
      const classesData: any = await classesRes.json();
      const bgsData: any = await bgsRes.json();
      setRaces((racesData.data || []).map((r: any) => r.name));
      setClasses((classesData.data || []).map((c: any) => c.name));
      setBackgrounds((bgsData.data || []).map((b: any) => b.name));
    } catch (e) {
      // Fallback to defaults
      setRaces(['Human', 'Elf', 'Dwarf']);
      setClasses(['Fighter', 'Wizard']);
      setBackgrounds(['Soldier', 'Criminal']);
    }
  };

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
          game_system_id: gameSystemId,
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
  
  // Roll 4d6 drop lowest
  const handleRollAbility = (stat: string) => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    const best3 = rolls.slice(0, 3);
    const total = best3.reduce((a, b) => a + b, 0);
    setAbilityScores(prev => ({ ...prev, [stat]: total }));
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

        {/* Character Wizard - Guided/Manual */}
        {step === 'create-wizard' && (
          <div className="card animate-slide-up" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">📝</span> Create Your Character - Step {wizardStep} of 5
            </div>
            
            {/* Step 1: Basics */}
            {wizardStep === 1 && (
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
                      <option value="">Any race...</option>
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
                      <option value="">Any class...</option>
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
                  <select
                    value={characterBackground}
                    onChange={(e) => setCharacterBackground(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Any background...</option>
                    <option value="Acolyte">Acolyte</option>
                    <option value="Criminal">Criminal</option>
                    <option value="Sage">Sage</option>
                    <option value="Soldier">Soldier</option>
                    <option value="Urchin">Urchin</option>
                    <option value="Noble">Noble</option>
                    <option value="Entertainer">Entertainer</option>
                    <option value="Folk Hero">Folk Hero</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Step 2: Ability Scores */}
            {wizardStep === 2 && (
              <div className="flex flex-col gap-md">
                <p className="text-secondary">Roll your ability scores (4d6 drop lowest) or use standard array.</p>
                
                <div className="grid grid-3 gap-md">
                  {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((stat) => (
                    <div key={stat} className="text-center">
                      <div className="text-muted text-sm">{stat}</div>
                      <div className="text-2xl text-gold font-display">{abilityScores[stat]}</div>
                      <div className="text-muted text-sm">{(abilityScores[stat] >= 10) ? `+${Math.floor((abilityScores[stat] - 10) / 2)}` : Math.floor((abilityScores[stat] - 10) / 2)}</div>
                      <div className="flex gap-sm mt-xs justify-center">
                        <button
                          type="button"
                          onClick={() => handleRollAbility(stat)}
                          className="btn btn-secondary text-sm"
                        >
                          Roll
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => setAbilityScores({ STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 })}
                  className="btn btn-secondary"
                >
                  Use Standard Array (15, 14, 13, 12, 10, 8)
                </button>
              </div>
            )}
            
            {/* Step 3: Personality */}
            {wizardStep === 3 && (
              <div className="flex flex-col gap-md">
                <div>
                  <label className="block text-secondary mb-sm">Personality Traits (what makes you unique)</label>
                  <textarea
                    value={personalityTraits}
                    onChange={(e) => setPersonalityTraits(e.target.value)}
                    placeholder="I'm always calm, no matter what's happening..."
                    className="w-full"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-secondary mb-sm">Ideals (what drives you)</label>
                  <textarea
                    value={ideals}
                    onChange={(e) => setIdeals(e.target.value)}
                    placeholder="The innocent must be protected..."
                    className="w-full"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-secondary mb-sm">Bonds (what connects you to the world)</label>
                  <textarea
                    value={bonds}
                    onChange={(e) => setBonds(e.target.value)}
                    placeholder="My family is my everything..."
                    className="w-full"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-secondary mb-sm">Flaws (your weaknesses)</label>
                  <textarea
                    value={flaws}
                    onChange={(e) => setFlaws(e.target.value)}
                    placeholder="I trust no one..."
                    className="w-full"
                    rows={2}
                  />
                </div>
              </div>
            )}
            
            {/* Step 4: Backstory */}
            {wizardStep === 4 && (
              <div className="flex flex-col gap-md">
                <div>
                  <label className="block text-secondary mb-sm">Backstory (2-3 sentences)</label>
                  <textarea
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value)}
                    placeholder="I grew up in a small village and always dreamed of adventure..."
                    className="w-full"
                    rows={5}
                  />
                </div>
                
                {createMode === 'guided' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setGenerating(true);
                      try {
                        const res = await fetch('/api/character-generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mode: 'guided',
                            preferences: { race: characterRace, class: characterClass, backstory }
                          })
                        });
                        const data = await res.json();
                        if (data.character) {
                          setGeneratedCharacter(data.character);
                          setWizardStep(5);
                        }
                      } catch (e) {
                        setError('Failed to generate');
                      } finally {
                        setGenerating(false);
                      }
                    }}
                    disabled={generating}
                    className="btn btn-secondary"
                  >
                    {generating ? 'Generating...' : '✨ Fill rest with AI'}
                  </button>
                )}
              </div>
            )}
            
            {/* Step 5: Review */}
            {wizardStep === 5 && (
              <div className="flex flex-col gap-md">
                <h4 className="text-gold">Review Your Character</h4>
                
                <div className="grid grid-2 gap-md text-sm">
                  <div><span className="text-muted">Name:</span> {characterName}</div>
                  <div><span className="text-muted">Race:</span> {characterRace || 'Human'}</div>
                  <div><span className="text-muted">Class:</span> {characterClass || 'Fighter'}</div>
                  <div><span className="text-muted">Background:</span> {characterBackground || 'Soldier'}</div>
                </div>
                
                <div className="divider" />
                
                <h5 className="text-muted">Ability Scores</h5>
                <div className="grid grid-3 gap-sm text-center">
                  {Object.entries(abilityScores).map(([stat, score]) => (
                    <div key={stat}>
                      <span className="text-muted">{stat}:</span> <span className="text-gold">{score}</span>
                    </div>
                  ))}
                </div>
                
                {(personalityTraits || backstory) && (
                  <>
                    <div className="divider" />
                    {personalityTraits && <div><span className="text-muted">Personality:</span> {personalityTraits}</div>}
                    {backstory && <div><span className="text-muted">Backstory:</span> {backstory}</div>}
                  </>
                )}
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex gap-md mt-lg">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) setWizardStep(wizardStep - 1);
                  else setStep('create-mode');
                }}
                className="btn btn-secondary flex-1"
              >
                Back
              </button>
              
              {createMode === 'manual' && wizardStep < 5 && (
                <button
                  type="button"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="btn btn-primary flex-1"
                >
                  Next
                </button>
              )}
              
              {wizardStep === 5 && (
                <button
                  type="button"
                  onClick={() => setStep('create-review')}
                  className="btn btn-primary flex-1"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Character Review */}
        {step === 'create-review' && (
          <div className="card animate-slide-up" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="card-header">
              <span className="text-gold">✓</span> Character Ready
            </div>
            
            <div className="flex flex-col gap-md">
              <p className="text-secondary">Your character is ready to play!</p>
              
              <button
                onClick={() => setStep('playing')}
                className="btn btn-primary w-full"
              >
                Enter the Game
              </button>
            </div>
          </div>
        )}
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