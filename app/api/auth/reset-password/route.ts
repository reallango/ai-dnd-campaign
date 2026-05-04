import { NextRequest, NextResponse } from 'next/server';
import { validatePasswordResetToken, resetPassword } from '@/lib/auth';

// POST /api/auth/reset-password - Reset password with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;
    
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password required' }, { status: 400 });
    }
    
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }
    
    // Validate token first
    const validation = validatePasswordResetToken(token);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }
    
    // Reset the password
    const result = resetPassword(token, newPassword);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

// GET /api/auth/reset-password - Validate token (for checking if link is valid)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    
    const validation = validatePasswordResetToken(token);
    
    return NextResponse.json({ 
      valid: validation.valid,
      username: validation.username 
    });
  } catch (error) {
    console.error('Validate token error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}