'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Theme {
  key: string;
  name: string;
  icon: string;
  description: string;
}

interface Character {
  id: number;
  name: string;
  race: string;
  class: string;
  background: string;
  level: number;
  ability_scores?: Record<string, number>;
  hit_points?: number;
  armor_class?: number;
}

const presetThemes: Theme[] = [
  { key: 'dungeon_crawl', name: 'Dungeon Crawl', icon: '🏰', description: 'Explore a dangerous dungeon filled with traps and treasure' },
  { key: 'wilderness_quest', name: 'Wilderness Quest', icon: '🌲', description: 'Journey through untamed wilds on a perilous mission' },
  { key: 'urban_intrigue', name: 'Urban Intrigue', icon: '🏙️', description: 'Navigate politics and mystery in a sprawling city' },
  { key: 'horror', name: 'Horror', icon: '👻', description: 'Survive the night in a place of unspeakable terror' },
  { key: 'epic_battle', name: 'Epic Battle', icon: '⚔️', description: 'Lead the charge in a war between kingdoms' },
  { key: 'surprise', name: 'Surprise Me', icon: '🎲', description: 'Let the AI choose a random adventure' },
];

const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn'];
const classes = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Paladin', 'Ranger', 'Bard', 'Barbarian', 'Druid', 'Monk', 'Sorcerer', 'Warlock'];
const backgrounds = ['Soldier', 'Criminal', 'Sage', 'Acolyte', 'Outlander', 'Entertainer', 'Folk Hero', 'Noble', 'Urchin'];

export default function OneShotPage() {
  const router = useRouter();
  const [step, setStep] = useState<'theme' | 'character' | 'playing'>('theme');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [customTheme, setCustomTheme] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'deadly'>('normal');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New character form
  const [newCharName, setNewCharName] = useState('');
  const [newCharRace, setNewCharRace] = useState('Human');
  const [newCharClass, setNewCharClass] = useState('Fighter');
  const [newCharBackground, setNewCharBackground] = useState('Soldier');
  const [newCharLoading, setNewCharLoading] = useState(false);
  
  useEffect(() => {
    if (step === 'character') {
      loadCharacters();
    }
  }, [step]);
  
  const loadCharacters = async () => {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      if (data.characters) {
        setCharacters(data.characters);
      }
    } catch (e) {
      console.error('Error loading characters:', e);
    }
  };
  
  const handleThemeSelect = (theme: Theme) => {
    if (theme.key === 'surprise') {
      setSelectedTheme({ key: 'surprise', name: 'Surprise Me', icon: '🎲', description: 'Let the AI choose a random adventure' });
      setShowCustom(false);
    } else if (theme.key === 'custom') {
      setSelectedTheme(null);
      setShowCustom(true);
    } else {
      setSelectedTheme(theme);
      setShowCustom(false);
    }
  };
  
  const canProceed = (): boolean => {
    if (selectedTheme?.key === 'surprise') return true;
    if (showCustom) return customTheme.trim().length >= 10;
    return !!selectedTheme;
  };
  
  const handleBeginAdventure = () => {
    if (!canProceed()) return;
    setStep('character');
  };
  
  const handleSelectCharacter = (char: Character) => {
    setSelectedChar(char);
    startAdventure(char, selectedTheme!, customTheme);
  };
  
  const handleQuickStart = async () => {
    setNewCharLoading(true);
    try {
      const res = await fetch('/api/character-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'random' }),
      });
      const data = await res.json();
      if (data.character) {
        const char: Character = {
          id: 0,
          name: data.character.name,
          race: data.character.race,
          class: data.character.class,
          background: data.character.background,
          level: data.character.level,
          ability_scores: data.character.ability_scores,
          hit_points: data.character.hit_points,
          armor_class: data.character.armor_class,
        };
        setSelectedChar(char);
        startAdventure(char, selectedTheme!, customTheme);
      } else {
        setError('Failed to generate character');
      }
    } catch (e) {
      setError('Failed to generate character');
    } finally {
      setNewCharLoading(false);
    }
  };
  
  const quickRollStats = (): Record<string, number> => {
    const roll4d6 = () => {
      const dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      dice.sort((a, b) => a - b);
      return dice[1] + dice[2] + dice[3];
    };
    return {
      STR: roll4d6(),
      DEX: roll4d6(),
      CON: roll4d6(),
      INT: roll4d6(),
      WIS: roll4d6(),
      CHA: roll4d6(),
    };
  };
  
  const handleCreateCharacter = () => {
    if (!newCharName.trim()) {
      setError('Character name is required');
      return;
    }
    const stats = quickRollStats();
    const char: Character = {
      id: 0,
      name: newCharName,
      race: newCharRace,
      class: newCharClass,
      background: newCharBackground,
      level: 1,
      ability_scores: stats,
    };
    setSelectedChar(char);
    startAdventure(char, selectedTheme!, customTheme);
  };
  
  const startAdventure = async (char: Character, theme: Theme | null, custom: string) => {
    setLoading(true);
    setError('');
    try {
      // Build campaign name and description
      const themeName = theme?.key === 'surprise' ? 'Mystery One-Shot' : (theme?.name || 'Custom One-Shot');
      const themeDesc = theme?.key === 'surprise' ? 'A surprise adventure chosen by the AI' : (custom.trim() || theme?.description || 'A solo adventure');
      const truncatedDesc = themeDesc.length > 200 ? themeDesc.substring(0, 200) : themeDesc;
      
      // Create campaign
      const campaignRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${themeName} - ${char.name}`,
          description: truncatedDesc,
          is_shared: 0,
        }),
      });
      const campaignData = await campaignRes.json();
      if (!campaignData.campaign) {
        throw new Error('Failed to create campaign');
      }
      const campaign = campaignData.campaign;
      
      // Create player entry with character
      const playerRes = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          name: char.name,
          character_name: char.name,
          class: char.class,
          race: char.race,
          background: char.background,
          level: char.level,
          is_connected: 1,
        }),
      });
      const playerData = await playerRes.json();
      if (!playerData.player) {
        throw new Error('Failed to create player entry');
      }
      
      // Create session (via narratives endpoint that auto-creates)
      await fetch(`/api/narratives/${campaign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'session_start',
          content: 'One-shot adventure session started',
        }),
      });
      
      // Navigate to gameplay
      router.push(`/oneshot/${campaign.code}`);
    } catch (e: any) {
      setError(e.message || 'Failed to start adventure');
      setLoading(false);
    }
  };
  
// Theme Selection Step
  if (step === 'theme') {
    return (
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gold">⚔️ One-Shot Adventure</h1>
              <p className="text-slate-400">A solo D&D adventure powered by AI</p>
            </div>
            <button onClick={() => router.push('/dashboard')} className="btn btn-secondary text-sm">
              ← Dashboard
            </button>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Choose Your Adventure</h2>
            
            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {presetThemes.map((theme) => (
                <button
                  key={theme.key}
                  onClick={() => handleThemeSelect(theme)}
                  className={`p-4 rounded-lg text-left transition ${
                    (selectedTheme?.key === theme.key || (theme.key === 'surprise' && selectedTheme?.key === 'surprise'))
                      ? 'bg-amber-600/30 border-2 border-amber-500'
                      : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{theme.icon}</div>
                  <div className="text-white font-semibold">{theme.name}</div>
                  {theme.key !== 'surprise' && (
                    <div className="text-slate-400 text-sm">{theme.description}</div>
                  )}
                </button>
              ))}
              
              {/* Custom Adventure Button */}
              <button
                onClick={() => handleThemeSelect({ key: 'custom', name: 'Custom Adventure', icon: '✏️', description: '' } as Theme)}
                className={`p-4 rounded-lg text-left transition ${
                  showCustom
                    ? 'bg-amber-600/30 border-2 border-amber-500'
                    : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">✏️</div>
                <div className="text-white font-semibold">Custom Adventure</div>
                <div className="text-slate-400 text-sm">Write your own theme</div>
              </button>
            </div>
            
            {/* Custom Theme Textarea */}
            {showCustom && (
              <div className="mb-6 p-4 bg-slate-800 rounded-lg">
                <textarea
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  placeholder="Describe your adventure... (e.g., 'I want to play as a pirate captain searching for a cursed treasure on a haunted island' or 'A mystery where I'm a detective in a fantasy city investigating murders linked to a cult')"
                  maxLength={500}
                  rows={4}
                  className="w-full bg-slate-900 text-white p-3 rounded border border-slate-700 focus:border-amber-500 outline-none"
                />
                <p className="text-slate-500 text-sm mt-2">
                  Be as detailed or vague as you like — the AI will build the world around your idea.
                </p>
              </div>
            )}
            
            {/* Difficulty Selector */}
            <div className="mb-8">
              <h3 className="text-white font-semibold mb-3">Difficulty</h3>
              <div className="flex flex-wrap gap-2">
                {(['easy', 'normal', 'hard', 'deadly'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`px-4 py-2 rounded transition ${
                      difficulty === diff
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Begin Button */}
            <button
              onClick={handleBeginAdventure}
              disabled={!canProceed() || loading}
              className="btn btn-primary w-full text-lg py-3 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Begin Adventure'}
            </button>
            {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
          </div>
        </main>
      </div>
    );
  }
  
  // Character Selection Step
  if (step === 'character') {
    const canCreateChar = newCharName.trim().length > 0;
    
    return (
     <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gold">⚔️ Choose Your Character</h1>
              <p className="text-slate-400">Select or create a character for your adventure</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('theme')} className="btn btn-secondary text-sm">
                ← Back
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn btn-secondary text-sm">
                Dashboard
              </button>
            </div>
          </div>
        </header>
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
          
          {/* Existing Characters */}
          {characters.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Your Characters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => handleSelectCharacter(char)}
                    disabled={loading}
                    className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition disabled:opacity-50"
                  >
                    <div className="text-white font-semibold">{char.name}</div>
                    <div className="text-slate-400 text-sm">
                      Level {char.level} {char.race} {char.class} • {char.background}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Quick Start */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
            <button
              onClick={handleQuickStart}
              disabled={newCharLoading || loading}
              className="btn btn-primary w-full py-3 disabled:opacity-50"
            >
              {newCharLoading ? 'Generating...' : '🎲 Quick Start - Random Character'}
            </button>
            <p className="text-slate-500 text-sm mt-2 text-center">
              Auto-generates a random character for you
            </p>
          </div>
          
          {/* Create New Character */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Character</h2>
            <div className="bg-slate-800 p-4 rounded-lg space-y-4">
              <div>
                <label className="text-slate-300 text-sm">Name</label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="Character name"
                  className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700 focus:border-amber-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 text-sm">Race</label>
                  <select
                    value={newCharRace}
                    onChange={(e) => setNewCharRace(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700 focus:border-amber-500 outline-none"
                  >
                    {races.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm">Class</label>
                  <select
                    value={newCharClass}
                    onChange={(e) => setNewCharClass(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700 focus:border-amber-500 outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm">Background</label>
                  <select
                    value={newCharBackground}
                    onChange={(e) => setNewCharBackground(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2 rounded border border-slate-700 focus:border-amber-500 outline-none"
                  >
                    {backgrounds.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleCreateCharacter}
                disabled={!canCreateChar || loading}
                className="btn btn-secondary w-full disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Create & Play'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Fallback
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
