'use client';

import { useState } from 'react';

interface AbilityScore {
  key: string;
  name: string;
}

interface StatGenMethod {
  key: string;
  name: string;
  description: string;
  type: string;
  dice?: string;
  keep?: string;
  values?: number[];
  total_points?: number;
}

interface AbilityScoreGeneratorProps {
  abilityScores: AbilityScore[];
  methods: StatGenMethod[];
  values: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
  gameSystemId?: number;
}

export default function AbilityScoreGenerator({
  abilityScores,
  methods,
  values,
  onChange,
  gameSystemId
}: AbilityScoreGeneratorProps) {
  const [selectedMethod, setSelectedMethod] = useState(methods[0]?.key || '4d6_drop_lowest');
  const [standardArrayValues, setStandardArrayValues] = useState<number[]>([]);
  const [pointBuyUsed, setPointBuyUsed] = useState(0);
  const maxLevel = 20;
  
  const method = methods.find(m => m.key === selectedMethod) || methods[0];
  const totalPoints = method?.total_points || 27;

  // Calculate modifier from score
  const getMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Roll stats using the selected method
  const rollStats = async () => {
    if (!method) return;

    if (method.type === 'roll') {
      // Roll Xd6 for each stat
      const rolled: number[] = [];
      for (let i = 0; i < 6; i++) {
        const dice = method.dice || '4d6';
        const res = await fetch('/api/dice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dice: dice, stat_gen: { method: method.key, game_system_id: gameSystemId } })
        });
        const data = await res.json();
        if (data.dice) {
          rolled.push(data.dice.result);
        }
      }
      
      // Apply keep/drop logic
      if (method.keep === 'highest3') {
        rolled.sort((a, b) => b - a);
      }
      
      const newValues: Record<string, number> = {};
      abilityScores.forEach((ability, i) => {
        newValues[ability.key] = rolled[i] || 10;
      });
      onChange(newValues);
    } else if (method.type === 'fixed' && method.values) {
      // Standard array - shuffle and assign
      const shuffled = [...method.values].sort(() => Math.random() - 0.5);
      setStandardArrayValues(shuffled);
    }
  };

  // Assign standard array value
  const assignStandardValue = (abilityKey: string, val: number) => {
    const newValues = { ...values };
    // Remove this value from available
    setStandardArrayValues(prev => prev.filter(v => v !== val));
    newValues[abilityKey] = val;
    onChange(newValues);
  };

  // Increment/decrement for point buy
  const adjustPointBuy = (abilityKey: string, delta: number) => {
    const current = values[abilityKey] || 8;
    const newScore = current + delta;
    
    if (newScore < 8 || newScore > 15) return;
    
    // Calculate point cost difference
    const costTable: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    const currentCost = costTable[current] || 0;
    const newCost = costTable[newScore] || 0;
    const pointDiff = newCost - currentCost;
    
    if (pointBuyUsed + pointDiff > totalPoints && delta > 0) return;
    
    setPointBuyUsed(prev => prev + pointDiff);
    onChange({ ...values, [abilityKey]: newScore });
  };

  return (
    <div className="mb-4">
      <label className="block text-slate-300 text-sm mb-2">Ability Scores</label>
      
      {/* Method selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {methods.map(m => (
          <button
            key={m.key}
            onClick={() => setSelectedMethod(m.key)}
            className={`px-3 py-1 rounded text-sm ${
              selectedMethod === m.key 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      
      {/* Method description */}
      {method?.description && (
        <p className="text-slate-500 text-xs mb-4">{method.description}</p>
      )}
      
      {/* Roll button for rolling method */}
      {method?.type === 'roll' && (
        <button
          onClick={rollStats}
          className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Roll Stats
        </button>
      )}
      
      {/* Ability rows */}
      <div className="space-y-2">
        {abilityScores.map(ability => (
          <div key={ability.key} className="flex items-center justify-between">
            <span className="text-slate-300 w-24">{ability.name}</span>
            
            {method?.type === 'point_buy' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustPointBuy(ability.key, -1)}
                  disabled={(values[ability.key] || 8) <= 8}
                  className="w-8 h-8 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50"
                >
                  -
                </button>
                <span className="text-white w-12 text-center">
                  {values[ability.key] || 8}
                </span>
                <button
                  onClick={() => adjustPointBuy(ability.key, 1)}
                  disabled={(values[ability.key] || 8) >= 15 || pointBuyUsed >= totalPoints}
                  className="w-8 h-8 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            ) : method?.type === 'fixed' && method.values ? (
              <select
                value={values[ability.key] || ''}
                onChange={(e) => assignStandardValue(ability.key, parseInt(e.target.value))}
                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white"
              >
                <option value="">Select...</option>
                {standardArrayValues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
                {values[ability.key] && (
                  <option value={values[ability.key]}>{values[ability.key]}</option>
                )}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={values[ability.key] || 10}
                  onChange={(e) => onChange({ ...values, [ability.key]: parseInt(e.target.value) || 10 })}
                  className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center"
                />
              </div>
            )}
            
            <span className={`w-12 text-center ${
              (values[ability.key] || 10) >= 10 ? 'text-green-400' : 'text-slate-400'
            }`}>
              ({getMod(values[ability.key] || 10)})
            </span>
          </div>
        ))}
      </div>
      
      {/* Point buy info */}
      {method?.type === 'point_buy' && (
        <div className="mt-4 text-slate-400 text-sm">
          Points used: {pointBuyUsed} / {totalPoints}
        </div>
      )}
      
      {/* Total modifier */}
      {method?.type === 'roll' || method?.type === 'fixed' ? (
        <div className="mt-4 text-slate-400 text-sm">
          Total: {Object.values(values).reduce((a, b) => a + b, 0)}
        </div>
      ) : null}
    </div>
  );
}