// Email utility for sending SMTP emails
import db from './db';

export interface EmailConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_tls: boolean;
}

export function getEmailSettings(): EmailConfig | null {
  try {
    const rows = db.prepare(`
      SELECT key, value FROM settings 
      WHERE key LIKE 'smtp_%'
    `).all() as { key: string; value: string }[];
    
    if (rows.length === 0) return null;
    
    const settings: Record<string, string> = {} as Record<string, string>;
    for (const row of rows) {
      (settings as any)[row.key] = row.value;
    }
    
    return {
      smtp_host: settings.smtp_host || '',
      smtp_port: settings.smtp_port || '587',
      smtp_user: settings.smtp_user || '',
      smtp_pass: settings.smtp_pass || '',
      smtp_from: settings.smtp_from || '',
      smtp_tls: settings.smtp_tls !== 'false',
    };
  } catch {
    return null;
  }
}

export function saveEmailSettings(config: Partial<EmailConfig>): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
  `);
  
  if (config.smtp_host !== undefined) stmt.run('smtp_host', config.smtp_host);
  if (config.smtp_port !== undefined) stmt.run('smtp_port', config.smtp_port);
  if (config.smtp_user !== undefined) stmt.run('smtp_user', config.smtp_user);
  if (config.smtp_pass !== undefined) stmt.run('smtp_pass', config.smtp_pass);
  if (config.smtp_from !== undefined) stmt.run('smtp_from', config.smtp_from);
  if (config.smtp_tls !== undefined) stmt.run('smtp_tls', config.smtp_tls ? 'true' : 'false');
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const config = getEmailSettings();
  
  if (!config || !config.smtp_host || !config.smtp_user) {
    return { success: false, error: 'Email not configured' };
  }
  
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_tls } = config;
  
  try {
    // Create SMTP connection using nodemailer
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port) || 587,
      secure: smtp_tls,
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
    });
    
    await transporter.sendMail({
      from: smtp_from || smtp_user,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Send email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}