import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { createApiToken, getApiTokens, revokeApiToken } from '@/lib/auth';

// GET /api/auth/tokens - list tokens for current user
// POST /api/auth/tokens - create new token
// DELETE /api/auth/tokens?id=x - revoke token
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT s.user_id 
      FROM user_sessions s
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as { user_id: number } | undefined;
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const tokens = getApiTokens(session.user_id);
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error listing tokens:', error);
    return NextResponse.json({ error: 'Failed to list tokens' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT s.user_id 
      FROM user_sessions s
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as { user_id: number } | undefined;
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, daysValid = 90 } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Token name required' }, { status: 400 });
    }
    
    const { token, expiresAt } = createApiToken(session.user_id, name, daysValid);
    
    return NextResponse.json({ token, expiresAt, name });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT s.user_id 
      FROM user_sessions s
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as { user_id: number } | undefined;
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    
    if (!id) {
      return NextResponse.json({ error: 'Token ID required' }, { status: 400 });
    }
    
    const revoked = revokeApiToken(id, session.user_id);
    
    if (!revoked) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking token:', error);
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 });
  }
}