'use client';

import { useState, useEffect } from 'react';

interface SpellPickerProps {
  gameSystemId: number;
  value: string[];
  onChange: (value: string[]) => void;
  classFilter?: string;
}

export default function SpellPicker({ gameSystemId, value, onChange, classFilter }: SpellPickerProps) {
  const [spells, setSpells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');

  // Fetch spells
  useEffect(() => {
    setLoading(true);
    fetch(`/api/game-systems/${gameSystemId}/data?category=spells`)
      .then(r => r.json())
      .then(data => {
        setSpells(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameSystemId]);

  // Filter spells
  const filteredSpells = spells.filter((spell: any) => {
    const matchesSearch = !search || spell.name.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || spell.level === levelFilter;
    const matchesClass = !classFilter || (spell.classes || []).includes(classFilter);
    return matchesSearch && matchesLevel && matchesClass;
  });

  const toggleSpell = (spellName: string) => {
    if (value.includes(spellName)) {
      onChange(value.filter(n => n !== spellName));
    } else {
      onChange([...value, spellName]);
    }
  };

  if (loading) {
    return <p className="text-slate-400">Loading spells...</p>;
  }

  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-2">Spells</label>
      
      {/* Filters */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search spells..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
        >
          <option value="all">All Levels</option>
          <option value="0">Cantrip</option>
          {[1,2,3,4,5,6,7,8,9].map(l => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>
      </div>
      
      {/* Spell list */}
      <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-700 rounded p-2">
        {filteredSpells.slice(0, 50).map((spell: any) => (
          <label key={spell.name} className="flex items-start gap-2 p-1 hover:bg-slate-700/50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(spell.name)}
              onChange={() => toggleSpell(spell.name)}
              className="mt-1 w-4 h-4"
            />
            <div>
              <span className="text-white text-sm">{spell.name}</span>
              <span className="text-slate-500 text-xs ml-2">Lvl {spell.level}</span>
              {spell.school && <span className="text-purple-400 text-xs ml-2">{spell.school}</span>}
            </div>
          </label>
        ))}
      </div>
      
      {/* Selected count */}
      {value.length > 0 && (
        <p className="text-slate-400 text-sm mt-2">
          {value.length} spell(s) selected
        </p>
      )}
    </div>
  );
}