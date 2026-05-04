import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

// GET /api/campaigns/[id] - get campaign by ID
// PUT /api/campaigns/[id] - update campaign (owner only)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get campaign' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT u.id, u.role FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(id, session.id) as any;
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or not owned by you' }, { status: 404 });
    }
    
    const body = await request.json();
    const { is_shared, name, description } = body;
    
    db.prepare(`
      UPDATE campaigns SET is_shared = ?, name = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(is_shared !== undefined ? (is_shared ? 1 : 0) : campaign.is_shared, name || campaign.name, description || campaign.description, id);
    
    const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id] - delete campaign (owner only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    
    // Check ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(id, session.id);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or not owned by you' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}