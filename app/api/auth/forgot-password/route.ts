import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, generatePasswordResetToken } from '@/lib/auth';
import { sendEmail, getEmailSettings } from '@/lib/email';

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Check if SMTP is configured
    const emailSettings = getEmailSettings();
    if (!emailSettings || !emailSettings.smtp_host || !emailSettings.smtp_user) {
      return NextResponse.json({ 
        error: 'Password reset is not enabled. Please contact the site administrator to enable this feature.' 
      }, { status: 503 });
    }
    
    // Always return success to prevent email enumeration
    // But actually try to send email if user exists
    
    const user = getUserByEmail(email);
    
    if (!user) {
      // User not found - still return success to prevent enumeration
      return NextResponse.json({ 
        success: true, 
        message: 'If that email exists, a reset link has been sent' 
      });
    }
    
    // Generate reset token
    const token = generatePasswordResetToken(user.id);
    
    // Get site URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    
    // Send reset email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Password Reset</h2>
  <p>Hello ${user.username},</p>
  <p>We received a request to reset your password. Click the button below to create a new password:</p>
  <div style="margin: 24px 0;">
    <a href="${resetLink}" style="background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Reset Password
    </a>
  </div>
  <p>Or copy and paste this link: <br/><a href="${resetLink}">${resetLink}</a></p>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
  <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
</div>
      `,
    });
    
    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Still return success to user
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'If that email exists, a reset link has been sent' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}