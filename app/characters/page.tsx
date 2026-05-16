'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Character {
  id: number;
  name: string;
  game_system_id?: number;
  game_system_name?: string;
  creation_mode?: string;
  portrait_url?: string;
  is_template?: number;
  version?: number;
  created_at: string;
  updated_at: string;
  summary?: {
    race?: string;
    class?: string;
    level?: number;
    background?: string;
  };
  character_data?: any;
}

export default function CharacterManager() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      if (data.characters) setCharacters(data.characters);
    } catch (e) {
      console.error('Error:', e);
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
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading characters...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-bold">🛡️ Character Manager</h2>
            <button 
              onClick={() => router.push('/characters/create')} 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              + Create Character
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-6">
        {characters.length === 0 ? (
          <div className="text-center text-slate-400 p-8">
            <p className="mb-4">No characters yet.</p>
            <button 
              onClick={() => router.push('/characters/create')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Your First Character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map(char => (
              <div key={char.id} className="bg-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-semibold">{char.name}</h3>
                  <span className="text-xs text-purple-400 uppercase bg-purple-900/50 px-2 py-1 rounded">
                    {char.creation_mode || 'manual'}
                  </span>
                </div>
                
                {char.game_system_name && (
                  <p className="text-slate-400 text-sm mb-2">{char.game_system_name}</p>
                )}
                
                <div className="text-sm text-slate-400 space-y-1">
                  <div>Race: {char.summary?.race || '-'}</div>
                  <div>Class: {char.summary?.class || '-'}</div>
                  <div>Level: {char.summary?.level || 1}</div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => router.push(`/characters/${char.id}`)}
                    className="flex-1 px-3 py-1 bg-slate-700 text-white text-sm rounded hover:bg-slate-600"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(char.id)} 
                    className="px-3 py-1 bg-red-900/50 text-red-400 text-sm rounded hover:bg-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
