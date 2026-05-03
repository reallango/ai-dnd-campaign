import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Dice notation parser
function parseDice(dice: string): { count: number; sides: number; modifier: number } {
  const match = dice.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    throw new Error('Invalid dice notation. Use format like "2d6+3"');
  }
  return {
    count: parseInt(match[1]),
    sides: parseInt(match[2]),
    modifier: match[3] ? parseInt(match[3]) : 0
  };
}

function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return rolls;
}

// POST /api/dice - Roll dice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_id, player_id, dice, label, is_anonymous } = body;
    
    if (!campaign_id || !dice) {
      return NextResponse.json({ error: 'campaign_id and dice are required' }, { status: 400 });
    }
    
    const { count, sides, modifier } = parseDice(dice);
    const rolls = rollDice(count, sides);
    const rollSum = rolls.reduce((a, b) => a + b, 0);
    const result = rollSum + modifier;
    
    const breakdown = modifier !== 0 
      ? `[${rolls.join('+')}${modifier > 0 ? '+' : ''}${modifier}] = ${rollSum}${modifier > 0 ? '+' : ''}${modifier}`
      : `[${rolls.join('+')}] = ${rollSum}`;
    
    const stmt = db.prepare(`
      INSERT INTO dice_rolls (campaign_id, player_id, dice, result, breakdown, label, is_anonymous)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const dbResult = stmt.run(
      campaign_id,
      player_id || null,
      dice,
      result,
      breakdown,
      label || '',
      is_anonymous ? 1 : 0
    );
    
    return NextResponse.json({
      dice: {
        id: dbResult.lastInsertRowid,
        dice,
        result,
        breakdown,
        label,
        is_anonymous: is_anonymous ? 1 : 0,
        rolls
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