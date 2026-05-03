import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

// GET /api/auth/me - get current logged in user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }
    
    // Look up session
    const session = db.prepare(`
      SELECT s.*, u.username, u.role 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session) {
      return NextResponse.json({ user: null });
    }
    
    return NextResponse.json({
      user: {
        id: session.user_id,
        username: session.username,
        role: session.role,
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null });
  }
}