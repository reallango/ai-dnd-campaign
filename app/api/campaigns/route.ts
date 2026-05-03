import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { customAlphabet } from 'nanoid';

const generateCampaignCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// GET /api/campaigns - List all campaigns
export async function GET() {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC').all();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, dm_name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    // Generate unique campaign code
    let code: string;
    let attempts = 0;
    do {
      code = generateCampaignCode();
      const existing = db.prepare('SELECT id FROM campaigns WHERE code = ?').get(code);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const stmt = db.prepare(`
      INSERT INTO campaigns (code, name, description, dm_name)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(code, name, description || '', dm_name || 'DM');
    
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}