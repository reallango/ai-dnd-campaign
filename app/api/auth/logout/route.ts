import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

// POST /api/auth/logout - logout user
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (sessionToken) {
      // Delete session from database
      db.prepare('DELETE FROM user_sessions WHERE token = ?').run(sessionToken);
    }
    
    // Clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}