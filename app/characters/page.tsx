'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Character {
  id: number;
  name: string;
  race?: string;
  class?: string;
  level: number;
  background?: string;
  stats?: string;
  inventory?: string;
  notes?: string;
  player_id?: number;
  created_at: string;
}

export default function CharacterManager() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'delete'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [charClass, setCharClass] = useState('');
  const [level, setLevel] = useState(1);
  const [background, setBackground] = useState('');
  
  useEffect(() => {
    loadCharacters();
  }, []);
  
  const loadCharacters = async () => {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      if (data.characters) setCharacters(data.characters);
    } catch (e) {
      console.error('Error:', e);
    }
  };
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, race, class: charClass, level, background })
      });
      const data = await res.json();
      
      if (data.character) {
        setMode('list');
        loadCharacters();
        clearForm();
      }
    } catch (e) {
      setError('Failed to create');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this character?')) return;
    
    try {
      const res = await fetch(`/api/characters?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCharacters(characters.filter(c => c.id !== id));
        setMode('list');
      }
    } catch (e) {
      setError('Failed to delete');
    }
  };
  
  const handleClone = (character: Character) => {
    setName(character.name + ' (Copy)');
    setRace(character.race || '');
    setCharClass(character.class || '');
    setLevel(character.level || 1);
    setBackground(character.background || '');
    setMode('create');
  };
  
  const handleEdit = (character: Character) => {
    setSelectedCharacter(character);
    setName(character.name);
    setRace(character.race || '');
    setCharClass(character.class || '');
    setLevel(character.level || 1);
    setBackground(character.background || '');
    setMode('edit');
  };
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/characters?id=${selectedCharacter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, race, class: charClass, level, background })
      });
      const data = await res.json();
      
      if (data.character) {
        setMode('list');
        loadCharacters();
        clearForm();
      }
    } catch (e) {
      setError('Failed to update');
    } finally {
      setLoading(false);
    }
  };
  
  const clearForm = () => {
    setName('');
    setRace('');
    setCharClass('');
    setLevel(1);
    setBackground('');
    setSelectedCharacter(null);
  };
  
  const generateRandom = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/character-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'random' })
      });
      const data = await res.json();
      
      if (data.character) {
        const c = data.character;
        setName(c.name || 'New Character');
        setRace(c.race || '');
        setCharClass(c.class || '');
        setLevel(c.level || 1);
        setBackground(c.background || '');
      }
    } catch (e) {
      setError('Failed to generate');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-tertiary border-b border-border p-md">
        <div className="container">
          <div className="flex items-center justify-between">
            <h2 className="text-gold">🛡️ Character Manager</h2>
            <button onClick={() => router.push('/dashboard')} className="btn btn-secondary text-sm">
              ← Dashboard
            </button>
          </div>
        </div>
      </header>
      
      <div className="container flex-1 py-lg">
        {/* List Mode */}
        {mode === 'list' && (
          <div className="grid gap-lg" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {characters.map(char => (
              <div key={char.id} className="card">
                <div className="card-header">
                  <span className="text-gold">{char.name}</span>
                </div>
                <div className="flex flex-col gap-sm text-sm">
                  <div><span className="text-muted">Race:</span> {char.race || '-'}</div>
                  <div><span className="text-muted">Class:</span> {char.class || '-'}</div>
                  <div><span className="text-muted">Level:</span> {char.level || 1}</div>
                  <div><span className="text-muted">Background:</span> {char.background || '-'}</div>
                </div>
                <div className="flex gap-sm mt-md">
                  <button onClick={() => handleEdit(char)} className="btn btn-secondary flex-1">
                    Edit
                  </button>
                  <button onClick={() => handleClone(char)} className="btn btn-secondary flex-1">
                    Clone
                  </button>
                  <button onClick={() => handleDelete(char.id)} className="btn btn-danger">
                    🗑
                  </button>
                </div>
              </div>
            ))}
            
            <button onClick={() => { clearForm(); setMode('create'); }} className="card card-dashed flex items-center justify-center" style={{ minHeight: '200px' }}>
              <div className="text-center">
                <div className="text-2xl">+</div>
                <div className="text-muted">Create New Character</div>
              </div>
            </button>
          </div>
        )}
        
        {/* Create/Edit Mode */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card-header">
              {mode === 'create' ? '✨' : '✏️'} {mode === 'create' ? 'Create' : 'Edit'} Character
            </div>
            
            <form onSubmit={mode === 'create' ? handleCreate : handleUpdate}>
              <div className="flex flex-col gap-md">
                <button
                  type="button"
                  onClick={generateRandom}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  🎲 Generate Random with AI
                </button>
                
                <div>
                  <label className="block text-secondary mb-sm">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Grom the Brave"
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="grid grid-2 gap-md">
                  <div>
                    <label className="block text-secondary mb-sm">Race</label>
                    <select value={race} onChange={(e) => setRace(e.target.value)} className="w-full">
                      <option value="">Select...</option>
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
                    <select value={charClass} onChange={(e) => setCharClass(e.target.value)} className="w-full">
                      <option value="">Select...</option>
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
                
                <div className="grid grid-2 gap-md">
                  <div>
                    <label className="block text-secondary mb-sm">Level</label>
                    <input
                      type="number"
                      value={level}
                      onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                      min={1}
                      max={20}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-secondary mb-sm">Background</label>
                    <select value={background} onChange={(e) => setBackground(e.target.value)} className="w-full">
                      <option value="">Select...</option>
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
                
                {error && <div className="text-crimson">{error}</div>}
                
                <div className="flex gap-md">
                  <button
                    type="button"
                    onClick={() => { setMode('list'); clearForm(); }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                    {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}