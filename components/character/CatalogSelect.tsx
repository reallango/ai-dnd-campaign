'use client';

import { useState, useEffect } from 'react';

interface CatalogSelectProps {
  gameSystemId: number;
  category: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CatalogSelect({ 
  gameSystemId, 
  category, 
  value, 
  onChange,
  placeholder = 'Select...'
}: CatalogSelectProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Fetch catalog data
  useEffect(() => {
    setLoading(true);
    fetch(`/api/game-systems/${gameSystemId}/data?category=${category}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameSystemId, category]);

  // Filter items
  const filteredItems = items.filter((item: any) => 
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Find selected item for display
  useEffect(() => {
    if (value && items.length > 0) {
      const found = items.find((i: any) => i.name === value);
      setSelectedItem(found);
    }
  }, [value, items]);

  if (loading) {
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1 capitalize">
          {category}
        </label>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-1 capitalize">
        {category}
      </label>
      
      {/* Search input */}
      <input
        type="text"
        placeholder={`Search ${category}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-2"
      />
      
      {/* Dropdown */}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      >
        <option value="">{placeholder}</option>
        {filteredItems.map((item: any) => (
          <option key={item.id || item.name} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>
      
      {/* Selected item details */}
      {selectedItem && (
        <div className="mt-2 p-3 bg-slate-700/50 rounded-lg">
          <h4 className="text-white font-semibold">{selectedItem.name}</h4>
          {selectedItem.description && (
            <p className="text-slate-400 text-sm mt-1">{selectedItem.description}</p>
          )}
          {selectedItem.ability_bonuses && (
            <p className="text-purple-400 text-sm mt-1">
              Ability: {JSON.stringify(selectedItem.ability_bonuses)}
            </p>
          )}
          {selectedItem.traits && (
            <div className="text-slate-500 text-xs mt-2">
              {Array.isArray(selectedItem.traits) 
                ? selectedItem.traits.join(', ')
                : selectedItem.traits
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}