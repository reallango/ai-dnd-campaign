'use client';

import { useState, useEffect } from 'react';

interface DiceRollerProps {
  systemConfig?: {
    dice_types?: string[];
    primary_die?: string;
  };
  onRoll?: (result: { dice: string; result: number; breakdown: string; rolls?: number[] }) => void;
  compact?: boolean;
  campaignId?: number;
}

interface RollResult {
  id: number;
  dice: string;
  result: number;
  breakdown: string;
  label?: string;
  created_at?: string;
  is_crit?: boolean;
  is_fumble?: boolean;
}

export default function DiceRoller({ systemConfig, onRoll, compact, campaignId }: DiceRollerProps) {
  const [expression, setExpression] = useState('d20');
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [advantage, setAdvantage] = useState<'none' | 'adv' | 'dis'>('none');

  // Default dice types
  const defaultDice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const diceTypes = systemConfig?.dice_types || defaultDice;

  // Quick roll function
  const quickRoll = async (dice: string) => {
    setExpression(dice);
    await rollDice(dice);
  };

  // Main roll function
  const rollDice = async (dice: string) => {
    setRolling(true);
    try {
      let diceExpr = dice;
      
      // Handle advantage/disadvantage
      if (dice === 'd20' && advantage !== 'none') {
        diceExpr = advantage === 'adv' ? '2d20kh1' : '2d20kl1';
      }

      const body: any = { dice: diceExpr };
      if (campaignId) body.campaign_id = campaignId;

      const res = await fetch('/api/dice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (data.dice) {
        const result: RollResult = {
          id: data.dice.id,
          dice: data.dice.dice,
          result: data.dice.result,
          breakdown: data.dice.breakdown,
          is_crit: data.dice.criticalHit,
          is_fumble: data.dice.criticalFail,
        };
        
        setLastResult(result);
        
        // Add to history
        setHistory(prev => [result, ...prev.slice(0, 9)]);
        
        if (onRoll) {
          onRoll({
            dice: result.dice,
            result: result.result,
            breakdown: result.breakdown,
            rolls: data.dice.rolls,
          });
        }
      }
    } catch (e) {
      console.error('Roll error:', e);
    } finally {
      setRolling(false);
    }
  };

  // Handle custom expression submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expression.trim()) {
      rollDice(expression.trim());
    }
  };

  // Determine result color
  const getResultColor = (result: RollResult) => {
    if (result.is_crit) return 'text-green-400';
    if (result.is_fumble) return 'text-red-400';
    return 'text-white';
  };

  if (compact) {
    return (
      <div className="bg-slate-800 rounded-lg p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="e.g. 4d6+2"
            className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          />
          <button
            type="submit"
            disabled={rolling}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {rolling ? '...' : 'Roll'}
          </button>
        </form>
        
        {/* Quick dice */}
        <div className="flex gap-1 mb-2">
          {diceTypes.slice(0, 4).map(d => (
            <button
              key={d}
              onClick={() => quickRoll(d)}
              disabled={rolling}
              className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600 disabled:opacity-50"
            >
              {d}
            </button>
          ))}
        </div>
        
        {/* Result */}
        {lastResult && (
          <div className={`text-center text-2xl font-bold ${getResultColor(lastResult)}`}>
            {lastResult.result}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Dice Roller</h3>
      
      {/* Quick dice buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {diceTypes.map(d => (
          <button
            key={d}
            onClick={() => quickRoll(d)}
            disabled={rolling}
            className="px-3 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
      </div>
      
      {/* Advantage toggle */}
      {expression === 'd20' && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAdvantage('none')}
            className={`px-2 py-1 rounded text-sm ${advantage === 'none' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            Normal
          </button>
          <button
            onClick={() => { setAdvantage('adv'); setExpression('d20'); }}
            className={`px-2 py-1 rounded text-sm ${advantage === 'adv' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            Advantage
          </button>
          <button
            onClick={() => { setAdvantage('dis'); setExpression('d20'); }}
            className={`px-2 py-1 rounded text-sm ${advantage === 'dis' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            Disadvantage
          </button>
        </div>
      )}
      
      {/* Custom expression input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="Custom roll (e.g. 4d6kh3+2)"
          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        />
        <button
          type="submit"
          disabled={rolling}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {rolling ? 'Rolling...' : 'Roll'}
        </button>
      </form>
      
      {/* Last result */}
      {lastResult && (
        <div className={`text-center text-4xl font-bold mb-4 ${getResultColor(lastResult)}`}>
          {lastResult.result}
        </div>
      )}
      {lastResult?.breakdown && (
        <div className="text-center text-slate-400 text-sm mb-4">
          {lastResult.breakdown}
        </div>
      )}
      
      {/* Roll history */}
      {history.length > 0 && (
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h4 className="text-slate-400 text-sm mb-2">Roll History</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {history.map((roll, i) => (
              <div key={roll.id} className="flex justify-between text-sm">
                <span className="text-slate-500">{roll.dice}</span>
                <span className={getResultColor(roll)}>{roll.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}