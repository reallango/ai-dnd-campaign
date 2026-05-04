import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { sendEmail, getEmailSettings } from '@/lib/email';

// POST /api/admin/test-email - send test email (admin only)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT u.role FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const body = await request.json();
    const { to } = body;
    
    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }
    
    // Check SMTP settings
    const emailSettings = getEmailSettings();
    if (!emailSettings || !emailSettings.smtp_host || !emailSettings.smtp_user) {
      return NextResponse.json({ error: 'SMTP settings not configured' }, { status: 400 });
    }
    
    // Send test email
    const result = await sendEmail({
      to,
      subject: 'Test Email from AI DND Campaign',
      html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #9333ea;">Test Email</h2>
  <p>This is a test email to verify your SMTP settings are working correctly.</p>
  <p>If you received this email, your email settings are configured properly!</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #6b7280; font-size: 14px;">Sent from AI DND Campaign</p>
</div>
      `,
    });
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}