import { NextRequest, NextResponse } from 'next/server';
import { createFirstUser, hasAdmin, authenticateUser } from '@/lib/auth';
import crypto from 'crypto';

// GET /api/auth/check - check if admin exists
export async function GET() {
  try {
    const needsSetup = !hasAdmin();
    return NextResponse.json({ needsSetup });
  } catch (error) {
    return NextResponse.json({ needsSetup: true });
  }
}

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
    } else {
      // Authenticate user
      const user = authenticateUser(username, password);
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const user = authenticateUser(username, password);

    return NextResponse.json({
      token,
      user: { id: user?.id, username: user?.username, role: user?.role }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}