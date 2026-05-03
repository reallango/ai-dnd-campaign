import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/players - List players for campaign
// POST /api/players - Add player to campaign
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }
    
    const players = db.prepare(`
      SELECT p.*, c.name as character_name, c.race, c.class, c.level, c.background
      FROM players p
      LEFT JOIN characters c ON p.character_id = c.id
      WHERE p.campaign_id = ?
      ORDER BY p.joined_at DESC
    `).all(campaignId);
    
    return NextResponse.json({ players });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_id, name, character_id } = body;
    
    if (!campaign_id || !name) {
      return NextResponse.json({ error: 'campaign_id and name required' }, { status: 400 });
    }
    
    // Verify campaign exists
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaign_id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    // Check player limit
    const playerCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE campaign_id = ?').get(campaign_id) as { count: number };
    if (playerCount.count >= 10) {
      return NextResponse.json({ error: 'Campaign is full (max 10 players)' }, { status: 400 });
    }
    
    const stmt = db.prepare(`
      INSERT INTO players (campaign_id, name, character_id)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(campaign_id, name, character_id || null);
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error('Error adding player:', error);
    return NextResponse.json({ error: 'Failed to add player' }, { status: 500 });
  }
}