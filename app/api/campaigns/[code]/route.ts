import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

// GET /api/campaigns/[code]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT /api/campaigns/[code] - update campaign (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
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
    
    const campaign: any = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.owner_id !== session.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, description, status, is_shared } = body;
    
    if (is_shared !== undefined) {
      db.prepare('UPDATE campaigns SET is_shared = ?, updated_at = datetime("now") WHERE code = ?').run(is_shared ? 1 : 0, code);
    }
    if (name !== undefined) {
      db.prepare('UPDATE campaigns SET name = ?, updated_at = datetime("now") WHERE code = ?').run(name, code);
    }
    if (description !== undefined) {
      db.prepare('UPDATE campaigns SET description = ?, updated_at = datetime("now") WHERE code = ?').run(description, code);
    }
    if (status !== undefined) {
      db.prepare('UPDATE campaigns SET status = ?, updated_at = datetime("now") WHERE code = ?').run(status, code);
    }
    
    const updated = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[code] - delete campaign (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
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
    
    const campaign: any = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.owner_id !== session.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    db.prepare('DELETE FROM campaigns WHERE code = ?').run(code);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}