'use client';

import { useState, useEffect } from 'react';

// Field definition from character schema
interface SchemaFieldDef {
  name: string;
  type: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  description?: string;
  default_value?: any;
  // For catalog types
  catalog?: string;
  multiple?: boolean;
}

interface SchemaFieldProps {
  field: SchemaFieldDef;
  value: any;
  onChange: (value: any) => void;
  gameSystemId: number;
}

export default function SchemaField({ field, value, onChange, gameSystemId }: SchemaFieldProps) {
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch catalog data for catalog types
  useEffect(() => {
    if (field.catalog) {
      setLoading(true);
      fetch(`/api/game-systems/${gameSystemId}/data?category=${field.catalog}`)
        .then(r => r.json())
        .then(data => {
          setCatalogData(data.data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [field.catalog, gameSystemId]);

  // Text input
  if (field.type === 'text') {
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-1">{field.description}</p>
        )}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
    );
  }

  // Number input
  if (field.type === 'number') {
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-1">{field.description}</p>
        )}
        <input
          type="number"
          value={value || field.default_value || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          min={field.min}
          max={field.max}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
    );
  }

  // Textarea
  if (field.type === 'textarea') {
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-1">{field.description}</p>
        )}
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          rows={4}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
      </div>
    );
  }

  // Select dropdown
  if (field.type === 'select') {
    const options = field.options || [];
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-1">{field.description}</p>
        )}
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // Catalog select (dynamic from API)
  if (field.type === 'catalog_select') {
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-1">{field.description}</p>
        )}
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="">Select...</option>
            {catalogData.map((item: any) => (
              <option key={item.id || item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  // Multi-select (checkboxes)
  if (field.type === 'multi_select') {
    const options = field.options || catalogData;
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
          {field.required && <span className="text-red-400"> *</span>}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-2">{field.description}</p>
        )}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {options.map((opt: any) => {
            const optValue = opt.value || opt.name;
            const isSelected = Array.isArray(value) && value.includes(optValue);
            return (
              <label key={optValue} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...(value || []), optValue]);
                    } else {
                      onChange((value || []).filter((v: string) => v !== optValue));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">{opt.label || optValue}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Boolean (toggle)
  if (field.type === 'boolean') {
    return (
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-slate-300 text-sm">
            {field.label || field.name}
          </span>
        </label>
      </div>
    );
  }

  // Currency tracker - delegate to dedicated component
  if (field.type === 'currency_tracker') {
    return (
      <CurrencyTracker
        value={value || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }}
        onChange={onChange}
      />
    );
  }

  // Item list - delegate to InventoryEditor
  if (field.type === 'item_list') {
    return (
      <InventoryEditor value={value || []} onChange={onChange} gameSystemId={gameSystemId} />
    );
  }

  // Spell list - delegate to SpellPicker
  if (field.type === 'spell_list') {
    return (
      <SpellPicker value={value || []} onChange={onChange} gameSystemId={gameSystemId} />
    );
  }

  // Ability scores - delegate to AbilityScoreGenerator
  if (field.type === 'ability_score') {
    // This is handled at a higher level
    return null;
  }

  // Skill list - simple checkbox list
  if (field.type === 'skill_list') {
    const options = field.options || catalogData;
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-2">{field.description}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt: any) => {
            const optValue = opt.value || opt.name;
            const isSelected = Array.isArray(value) && value.includes(optValue);
            return (
              <label key={optValue} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...(value || []), optValue]);
                    } else {
                      onChange((value || []).filter((v: string) => v !== optValue));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">{opt.label || optValue}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Image URL
  if (field.type === 'image_url') {
    return (
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {field.label || field.name}
        </label>
        {field.description && (
          <p className="text-slate-500 text-xs mb-1">{field.description}</p>
        )}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
        {value && (
          <div className="mt-2">
            <img src={value} alt="Preview" className="w-24 h-24 object-cover rounded" />
          </div>
        )}
      </div>
    );
  }

  // Default: text input
  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-1">
        {field.label || field.name}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
      />
    </div>
  );
}

// Simple currency tracker component
function CurrencyTracker({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const units = ['cp', 'sp', 'ep', 'gp', 'pp'];
  
  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-2">Currency</label>
      <div className="grid grid-cols-5 gap-2">
        {units.map(unit => (
          <div key={unit}>
            <label className="block text-slate-500 text-xs mb-1 uppercase">{unit}</label>
            <input
              type="number"
              min="0"
              value={value?.[unit] || 0}
              onChange={(e) => onChange({ ...value, [unit]: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple inventory editor
function InventoryEditor({ value, onChange, gameSystemId }: { value: any[]; onChange: (v: any[]) => void; gameSystemId: number }) {
  const [items, setItems] = useState<any[]>([]);
  
  useEffect(() => {
    fetch(`/api/game-systems/${gameSystemId}/data?category=items`)
      .then(r => r.json())
      .then(data => setItems(data.data || []))
      .catch(() => {});
  }, [gameSystemId]);

  const addItem = () => {
    onChange([...(value || []), { name: '', quantity: 1, equipped: false }]);
  };

  const updateItem = (index: number, updates: any) => {
    const newItems = [...(value || [])];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange((value || []).filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-2">Equipment</label>
      {(value || []).map((item: any, i: number) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Item name"
            value={item.name}
            onChange={(e) => updateItem(i, { name: e.target.value })}
            className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 })}
            className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={item.equipped}
              onChange={(e) => updateItem(i, { equipped: e.target.checked })}
              className="w-4 h-4"
            />
          </label>
          <button onClick={() => removeItem(i)} className="text-red-400">×</button>
        </div>
      ))}
      <button onClick={addItem} className="text-purple-400 text-sm">+ Add Item</button>
    </div>
  );
}

// Simple spell picker
function SpellPicker({ value, onChange, gameSystemId }: { value: any[]; onChange: (v: any[]) => void; gameSystemId: number }) {
  const [spells, setSpells] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  
  useEffect(() => {
    fetch(`/api/game-systems/${gameSystemId}/data?category=spells`)
      .then(r => r.json())
      .then(data => setSpells(data.data || []))
      .catch(() => {});
  }, [gameSystemId]);

  const filteredSpells = spells.filter((s: any) => 
    !filter || s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleSpell = (spellName: string) => {
    if (value.includes(spellName)) {
      onChange(value.filter((n: string) => n !== spellName));
    } else {
      onChange([...value, spellName]);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-2">Spells</label>
      <input
        type="text"
        placeholder="Search spells..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm mb-2"
      />
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filteredSpells.slice(0, 50).map((spell: any) => (
          <label key={spell.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.includes(spell.name)}
              onChange={() => toggleSpell(spell.name)}
              className="w-4 h-4"
            />
            <span className="text-white text-sm">{spell.name}</span>
            <span className="text-slate-500 text-xs">Lvl {spell.level}</span>
          </label>
        ))}
      </div>
    </div>
  );
}