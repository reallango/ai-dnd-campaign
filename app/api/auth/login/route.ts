import { NextRequest, NextResponse } from 'next/server';
import { createFirstUser, authenticateUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import crypto from 'crypto';

// POST /api/auth/login - login or setup first user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, email, isFirstTime } = body;

    if (isFirstTime) {
      // Create first admin user
      const result = createFirstUser(username, password, email);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // Authenticate user (or get newly created user)
    const user = authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate token and save session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    db.prepare(`
      INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt);
    
    // Set cookie in response
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role }
    });
    
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}