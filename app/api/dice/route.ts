import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { rollDice, rollWithAdvantage, rollWithDisadvantage, rollStatArray, DiceRollResult } from '@/lib/dice-engine';

// POST /api/dice - Roll dice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_id, player_id, dice, label, is_anonymous, stat_gen } = body;
    
    let result: DiceRollResult;
    
    // Handle stat generation mode
    if (stat_gen?.method && stat_gen?.game_system_id) {
      // Get the stat generation method from game system config
      const sysRow = db.prepare('SELECT config FROM game_systems WHERE id = ?').get(stat_gen.game_system_id) as { config: string } | undefined;
      
      let config: any = {};
      if (sysRow?.config) {
        try { config = JSON.parse(sysRow.config); } catch (e) {}
      }
      
      const method = config?.stat_generation_methods?.find((m: any) => m.key === stat_gen.method);
      
      if (!method) {
        // Use default 4d6 drop lowest
        result = rollDice('4d6kh3');
      } else {
        const { rolls, totals } = rollStatArray(method);
        // Return the rolled stat array
        return NextResponse.json({
          dice: {
            is_stat_gen: true,
            method: stat_gen.method,
            rolls,
            totals,
            average: totals.reduce((a, b) => a + b, 0) / totals.length
          }
        }, { status: 201 });
      }
    } else if (dice === 'advantage') {
      const advResult = rollWithAdvantage();
      result = {
        expression: '2d20kh1 (Advantage)',
        rolls: [advResult.roll1, advResult.roll2],
        kept: [advResult.result],
        dropped: [advResult.roll1 === advResult.result ? advResult.roll2 : advResult.roll1],
        modifier: 0,
        total: advResult.result,
        breakdown: `[${advResult.roll1}, ${advResult.roll2}] advantage → ${advResult.result}`,
        criticalHit: advResult.result === 20,
        criticalFail: advResult.result === 1
      };
    } else if (dice === 'disadvantage') {
      const disResult = rollWithDisadvantage();
      result = {
        expression: '2d20kl1 (Disadvantage)',
        rolls: [disResult.roll1, disResult.roll2],
        kept: [disResult.result],
        dropped: [disResult.roll1 === disResult.result ? disResult.roll2 : disResult.roll1],
        modifier: 0,
        total: disResult.result,
        breakdown: `[${disResult.roll1}, ${disResult.roll2}] disadvantage → ${disResult.result}`,
        criticalHit: false,
        criticalFail: disResult.result === 1
      };
    } else if (!campaign_id || !dice) {
      return NextResponse.json({ error: 'campaign_id and dice are required' }, { status: 400 });
    } else {
      result = rollDice(dice);
    }
    
    // Save to database
    const stmt = db.prepare(`
      INSERT INTO dice_rolls (campaign_id, player_id, dice, result, breakdown, label, is_anonymous)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const dbResult = stmt.run(
      campaign_id,
      player_id || null,
      result.expression,
      result.total,
      result.breakdown,
      label || '',
      is_anonymous ? 1 : 0
    );
    
    return NextResponse.json({
      dice: {
        id: dbResult.lastInsertRowid,
        dice: result.expression,
        result: result.total,
        breakdown: result.breakdown,
        label,
        is_anonymous: is_anonymous ? 1 : 0,
        rolls: result.rolls,
        kept: result.kept,
        criticalHit: result.criticalHit,
        criticalFail: result.criticalFail
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error rolling dice:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to roll dice' }, { status: 500 });
  }
}

// GET /api/dice - Get dice history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }
    
    const rolls = db.prepare(`
      SELECT dr.*, p.name as player_name
      FROM dice_rolls dr
      LEFT JOIN players p ON dr.player_id = p.id
      WHERE dr.campaign_id = ?
      ORDER BY dr.created_at DESC
      LIMIT ?
    `).all(campaignId, limit);
    
    return NextResponse.json({ rolls });
  } catch (error) {
    console.error('Error fetching dice rolls:', error);
    return NextResponse.json({ error: 'Failed to fetch dice rolls' }, { status: 500 });
  }
}