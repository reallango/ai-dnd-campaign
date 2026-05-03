import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { customAlphabet } from 'nanoid';

const generateCampaignCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// GET /api/campaigns - List campaigns for current user
export async function GET() {
  try {
    // Get current user session
    let userId: number | null = null;
    let isAdmin = false;
    
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session')?.value;
      
      if (sessionToken) {
        const session = db.prepare(`
          SELECT u.id, u.role FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token = ? AND s.expires_at > datetime('now')
        `).get(sessionToken) as any;
        
        if (session) {
          userId = session.id;
          isAdmin = session.role === 'admin';
        }
      }
    } catch (e) {
      // No session
    }
    
    let campaigns;
    if (isAdmin) {
      // Admin sees all campaigns
      campaigns = db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC').all();
    } else if (userId) {
      // GM sees own campaigns + shared ones
      campaigns = db.prepare(`
        SELECT * FROM campaigns 
        WHERE owner_id = ? OR is_shared = 1 
        ORDER BY updated_at DESC
      `).all(userId);
    } else {
      // No session - only shared campaigns
      campaigns = db.prepare(`
        SELECT * FROM campaigns 
        WHERE is_shared = 1 
        ORDER BY updated_at DESC
      `).all();
    }
    
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT u.id FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = session.id;
    const body = await request.json();
    const { name, description, game_system, is_shared } = body;

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
      INSERT INTO campaigns (owner_id, code, name, description, game_system, is_shared)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId, 
      code, 
      name, 
      description || '',
      game_system || 'dnd5e',
      is_shared ? 1 : 0
    );
    
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}