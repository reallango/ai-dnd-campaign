'use client';

import { useState, useEffect } from 'react';

interface InventoryItem {
  name: string;
  quantity: number;
  equipped: boolean;
  weight?: number;
  value?: number;
}

interface InventoryEditorProps {
  gameSystemId: number;
  value: InventoryItem[];
  onChange: (value: InventoryItem[]) => void;
}

export default function InventoryEditor({ gameSystemId, value, onChange }: InventoryEditorProps) {
  const [items, setItems] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch items catalog
  useEffect(() => {
    fetch(`/api/game-systems/${gameSystemId}/data?category=items`)
      .then(r => r.json())
      .then(data => setItems(data.data || []))
      .catch(() => {});
  }, [gameSystemId]);

  const filteredItems = items.filter((i: any) => 
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (itemName: string, weight?: number, gpValue?: number) => {
    const currentItems: any[] = value || [];
    onChange([...currentItems, { name: itemName, quantity: 1, equipped: false, weight, value: gpValue }]);
    setShowAdd(false);
    setSearch('');
  };

  const updateItem = (index: number, updates: Partial<InventoryItem>) => {
    const newItems = [...value];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const totalWeight = value.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
  const totalValue = value.reduce((sum, item) => sum + (item.value || 0) * item.quantity, 0);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-slate-300 text-sm">Equipment</label>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-purple-400 text-sm hover:text-purple-300"
        >
          + Add Item
        </button>
      </div>
      
      {/* Add item popup */}
      {showAdd && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm mb-2"
          />
          <div className="max-h-32 overflow-y-auto">
            {filteredItems.slice(0, 10).map((item: any) => (
              <button
                key={item.name}
                onClick={() => addItem(item.name, item.weight, item.cost)}
                className="w-full text-left px-2 py-1 text-white text-sm hover:bg-slate-600 rounded"
              >
                {item.name}
              </button>
            ))}
            <button
              onClick={() => addItem(search || 'New Item')}
              className="w-full text-left px-2 py-1 text-purple-400 text-sm hover:bg-slate-600 rounded"
            >
              + Add custom: {search || 'New Item'}
            </button>
          </div>
        </div>
      )}
      
      {/* Item list */}
      {value.length === 0 ? (
        <p className="text-slate-500 text-sm">No equipment</p>
      ) : (
        <div className="space-y-2">
          {value.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.equipped}
                onChange={(e) => updateItem(i, { equipped: e.target.checked })}
                className="w-4 h-4"
                title="Equipped"
              />
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center"
              />
              <button
                onClick={() => removeItem(i)}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Totals */}
      {value.length > 0 && (
        <div className="mt-4 pt-2 border-t border-slate-700 text-sm text-slate-400">
          <span>Weight: {totalWeight.toFixed(1)} lbs</span>
          <span className="ml-4">Value: {totalValue} gp</span>
        </div>
      )}
    </div>
  );
}