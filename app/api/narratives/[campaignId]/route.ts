import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

// GET /api/narratives/[campaignId] - get narratives for campaign
// POST /api/narratives/[campaignId] - create new narrative entry

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    
    // Get all sessions for this campaign, get narrative logs for each
    const sessions = db.prepare(`
      SELECT id FROM sessions WHERE campaign_id = ? ORDER BY started_at DESC LIMIT 10
    `).all(campaignId) as { id: number }[];
    
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ narratives: [] });
    }
    
    const sessionIds = sessions.map(s => s.id);
    const placeholders = sessionIds.map(() => '?').join(',');
    
    const narratives = db.prepare(`
      SELECT nl.*, s.mode as session_mode
      FROM narrative_logs nl
      JOIN sessions s ON nl.session_id = s.id
      WHERE nl.session_id IN (${placeholders})
      ORDER BY nl.created_at DESC
    `).all(...sessionIds);
    
    return NextResponse.json({ narratives });
  } catch (error) {
    console.error('Error fetching narratives:', error);
    return NextResponse.json({ error: 'Failed to fetch narratives' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const body = await request.json();
    const { type, content, metadata } = body;
    
    // Get or create active session
    let session = db.prepare(`
      SELECT id FROM sessions WHERE campaign_id = ? AND status = 'waiting' ORDER BY started_at DESC LIMIT 1
    `).get(campaignId) as { id: number } | undefined;
    
    let sessionId: number;
    
    if (!session) {
      // Create new session
      const result = db.prepare(`
        INSERT INTO sessions (campaign_id, mode, status) VALUES (?, 'live', 'waiting')
      `).run(campaignId);
      sessionId = result.lastInsertRowid as number;
    } else {
      sessionId = session.id;
    }
    
    // Insert narrative entry
    const result = db.prepare(`
      INSERT INTO narrative_logs (session_id, type, content, metadata)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, type, content, metadata ? JSON.stringify(metadata) : null);
    
    const entry = db.prepare('SELECT * FROM narrative_logs WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ narrative: entry });
  } catch (error) {
    console.error('Error creating narrative:', error);
    return NextResponse.json({ error: 'Failed to create narrative' }, { status: 500 });
  }
}