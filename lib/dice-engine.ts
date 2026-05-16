// Dice Engine: Comprehensive dice expression parser and evaluator
// Supports: basic notation, multiple terms, keep highest/lowest, exploding, reroll, etc.

export interface DiceRollResult {
  expression: string;
  rolls: number[];
  kept: number[];
  dropped: number[];
  modifier: number;
  total: number;
  breakdown: string;
  criticalHit?: boolean;
  criticalFail?: boolean;
}

export interface StatGenMethod {
  key: string;
  name: string;
  description: string;
  type: 'roll' | 'fixed' | 'point_buy';
  dice?: string;
  keep?: string;
  repeat?: number;
  values?: number[];
  total_points?: number;
  min_score?: number;
  max_score?: number;
  cost_table?: Record<string, number>;
}

export interface AdvantageResult {
  roll1: number;
  roll2: number;
  result: number;
  type: 'advantage' | 'disadvantage';
}

export interface DicePoolResult {
  rolls: number[];
  successes: number;
  ones: number;
}

// Parse dice expression
function parseExpression(expr: string): {
  count: number;
  sides: number;
  modifier: number;
  keep: number | null;
  drop: number | null;
  isKeep: boolean;
  exploding: boolean;
  reroll: number | null;
  minimum: number | null;
} {
  // Clean expression
  const clean = expr.toLowerCase().replace(/\s+/g, '');
  
  // Match pattern: XdY[ops][+/-mod]
  const match = clean.match(/^(\d+)d(\d+)(kh|kl|dh|dl)?(\d+)?(!)?(r(\d+))?(mi(\d+))?([+-]\d+)?$/);
  
  if (!match) {
    // Try simpler pattern
    const simpleMatch = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (simpleMatch) {
      return {
        count: parseInt(simpleMatch[1]),
        sides: parseInt(simpleMatch[2]),
        modifier: simpleMatch[3] ? parseInt(simpleMatch[3]) : 0,
        keep: null,
        drop: null,
        isKeep: true,
        exploding: false,
        reroll: null,
        minimum: null
      };
    }
    throw new Error(`Invalid dice expression: ${expr}`);
  }
  
  const [, count, sides, keepOp, keepNum, exploding, rerollVal, rerollNum, minVal, modifier] = match;
  
  let isKeep = true; // kh/kl = keep, dl/dh = drop
  let keep: number | null = keepNum ? parseInt(keepNum) : null;
  let drop: number | null = null;
  
  if (keepOp === 'dl' || keepOp === 'dh') {
    isKeep = false;
    keep = null;
    drop = keepNum ? parseInt(keepNum) : 1;
  }
  
  return {
    count: parseInt(count),
    sides: parseInt(sides),
    modifier: modifier ? parseInt(modifier) : 0,
    keep,
    drop,
    isKeep,
    exploding: !!exploding,
    reroll: rerollVal ? parseInt(rerollNum) : null,
    minimum: minVal ? parseInt(minVal) : null
  };
}

// Roll a single die with rerolls
function rollWithReroll(sides: number, rerollBelow: number | null): number {
  let roll = Math.floor(Math.random() * sides) + 1;
  
  if (rerollBelow !== null) {
    while (roll <= rerollBelow) {
      roll = Math.floor(Math.random() * sides) + 1;
    }
  }
  
  return roll;
}

// Roll with explosion
function rollExploding(count: number, sides: number): number[] {
  const rolls: number[] = [];
  
  for (let i = 0; i < count; i++) {
    let roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    
    // Exploding: roll again on max
    while (roll === sides && rolls.length < count + 10) { // Safety cap
      roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
    }
  }
  
  return rolls;
}

// Main roll function
export function rollDice(expression: string): DiceRollResult {
  // Security limits
  const MAX_DICE = 100;
  const MAX_SIDES = 1000;
  const MAX_EXPR_LEN = 200;
  
  if (expression.length > MAX_EXPR_LEN) {
    throw new Error('Expression too long');
  }
  
  // Handle multiple terms like "1d8+1d6+5"
  const terms = expression.split(/(?=[+-])/g).filter(t => t.trim());
  
  if (terms.length > 1) {
    // Process each term and sum
    let total = 0;
    let allRolls: number[] = [];
    let breakdown = '';
    
    for (const term of terms) {
      if (term.match(/^[+-]\d+$/)) {
        // Pure modifier
        total += parseInt(term);
        breakdown += term;
      } else {
        const result = rollDice(term.trim());
        total += result.total;
        allRolls.push(...result.rolls);
        breakdown += (breakdown && result.total >= 0 ? '+' : '') + result.breakdown;
      }
    }
    
    return {
      expression,
      rolls: allRolls,
      kept: allRolls,
      dropped: [],
      modifier: 0,
      total,
      breakdown
    };
  }
  
  // Single term
  const parsed = parseExpression(expression);
  
  // Security check
  if (parsed.count > MAX_DICE || parsed.sides > MAX_SIDES) {
    throw new Error(`Dice count or sides exceeds limit (max ${MAX_DICE} dice, max ${MAX_SIDES} sides)`);
  }
  
  let rolls: number[];
  let kept: number[];
  let dropped: number[] = [];
  
  // Roll
  if (parsed.exploding) {
    rolls = rollExploding(parsed.count, parsed.sides);
  } else if (parsed.reroll) {
    rolls = [];
    for (let i = 0; i < parsed.count; i++) {
      rolls.push(rollWithReroll(parsed.sides, parsed.reroll));
    }
  } else {
    rolls = [];
    for (let i = 0; i < parsed.count; i++) {
      let roll = Math.floor(Math.random() * parsed.sides) + 1;
      // Apply minimum
      if (parsed.minimum && roll < parsed.minimum) {
        roll = parsed.minimum;
      }
      rolls.push(roll);
    }
  }
  
  // Keep/drop logic
  if (parsed.keep && parsed.keep < parsed.count) {
    kept = [...rolls].sort((a, b) => b - a).slice(0, parsed.keep);
    dropped = rolls.filter(r => !kept.includes(r));
  } else if (parsed.drop && parsed.drop < parsed.count) {
    kept = [...rolls].sort((a, b) => b - a).slice(0, parsed.count - parsed.drop);
    dropped = rolls.filter(r => !kept.includes(r));
  } else {
    kept = [...rolls];
  }
  
  const rollSum = kept.reduce((a, b) => a + b, 0);
  const total = rollSum + parsed.modifier;
  
  // Build breakdown string
  let breakdown = '';
  if (parsed.keep) {
    breakdown = `[${rolls.join(',')}] keep highest ${parsed.keep} = ${rollSum}`;
  } else if (parsed.drop) {
    breakdown = `[${rolls.join(',')}] drop lowest ${parsed.drop} = ${rollSum}`;
  } else {
    breakdown = `[${rolls.join(',')}]`;
  }
  
  if (parsed.modifier !== 0) {
    breakdown += parsed.modifier > 0 ? ` + ${parsed.modifier}` : ` - ${Math.abs(parsed.modifier)}`;
    breakdown += ` = ${total}`;
  } else if (!parsed.keep && !parsed.drop) {
    breakdown = `[${rolls.join(',')}] = ${total}`;
  }
  
  // Critical hit/fail detection (d20 only)
  let criticalHit: boolean | undefined;
  let criticalFail: boolean | undefined;
  
  if (parsed.sides === 20 && parsed.count === 1) {
    criticalHit = rolls[0] === 20;
    criticalFail = rolls[0] === 1;
  }
  
  return {
    expression,
    rolls,
    kept,
    dropped,
    modifier: parsed.modifier,
    total,
    breakdown,
    criticalHit,
    criticalFail
  };
}

// Roll with advantage
export function rollWithAdvantage(): AdvantageResult {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  const result = Math.max(roll1, roll2);
  
  return { roll1, roll2, result, type: 'advantage' };
}

// Roll with disadvantage
export function rollWithDisadvantage(): AdvantageResult {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  const result = Math.min(roll1, roll2);
  
  return { roll1, roll2, result, type: 'disadvantage' };
}

// Roll dice pool (WoD style - count successes)
export function rollDicePool(count: number, sides: number, target: number): DicePoolResult {
  const MAX_DICE = 100;
  
  if (count > MAX_DICE) {
    throw new Error(`Too many dice: max ${MAX_DICE}`);
  }
  
  const rolls: number[] = [];
  let successes = 0;
  let ones = 0;
  
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    
    if (roll >= target) {
      successes++;
    }
    if (roll === 1) {
      ones++;
    }
  }
  
  return { rolls, successes, ones };
}

// Roll stat array (for character generation)
export function rollStatArray(method: StatGenMethod): { rolls: number[][], totals: number[] } {
  const results: number[][] = [];
  const totals: number[] = [];
  
  if (method.type === 'roll') {
    const count = method.repeat || 6;
    
    for (let i = 0; i < count; i++) {
      // Roll 4d6, drop lowest
      const rolls = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      
      if (method.keep === 'highest3') {
        rolls.sort((a, b) => a - b);
        rolls.shift(); // Remove lowest
      }
      
      results.push(rolls);
      totals.push(rolls.reduce((a, b) => a + b, 0));
    }
  } else if (method.type === 'fixed' && method.values) {
    // Standard array - just use the values
    for (const v of method.values) {
      results.push([v]);
      totals.push(v);
    }
  } else if (method.type === 'point_buy') {
    // Return empty - point buy is interactive
    for (let i = 0; i < 6; i++) {
      results.push([]);
      totals.push(0);
    }
  }
  
  return { rolls: results, totals };
}