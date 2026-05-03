import { NextRequest, NextResponse } from 'next/server';
import { createFirstUser, authenticateUser } from '@/lib/auth';
import crypto from 'crypto';

// POST /api/auth/login - login or setup first user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, isFirstTime } = body;

    if (isFirstTime) {
      // Create first admin user
      const result = createFirstUser(username, password);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // Authenticate user (or get newly created user)
    const user = authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}