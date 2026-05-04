import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/admin/settings - retrieve settings
export async function GET() {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Set defaults
    const defaults: Record<string, string> = {
      ai_provider: 'ollama',
      ai_base_url: process.env.AI_BASE_URL || 'http://localhost:11434',
      ai_model: process.env.AI_MODEL || 'llama3',
      ai_api_key: process.env.AI_API_KEY || '',
      ai_context_window: '4096',
      ai_keep_loaded: '300',
      ai_adult_content: 'false',
      ai_timeout: '120',
    };

    return NextResponse.json({
      ai_provider: settings.ai_provider || defaults.ai_provider,
      ai_base_url: settings.ai_base_url || defaults.ai_base_url,
      ai_model: settings.ai_model || defaults.ai_model,
      ai_api_key: settings.ai_api_key || defaults.ai_api_key,
      ai_context_window: settings.ai_context_window || defaults.ai_context_window,
      ai_keep_loaded: settings.ai_keep_loaded || defaults.ai_keep_loaded,
      ai_adult_content: settings.ai_adult_content || defaults.ai_adult_content,
      ai_timeout: settings.ai_timeout || defaults.ai_timeout,
      smtp_host: settings.smtp_host || '',
      smtp_port: settings.smtp_port || '587',
      smtp_user: settings.smtp_user || '',
      smtp_pass: settings.smtp_pass || '',
      smtp_from: settings.smtp_from || '',
      smtp_tls: settings.smtp_tls !== 'false',
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// POST /api/admin/settings - save settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    // Save AI settings
    if (body.ai_provider !== undefined) upsert.run('ai_provider', body.ai_provider);
    if (body.ai_base_url !== undefined) upsert.run('ai_base_url', body.ai_base_url);
    if (body.ai_model !== undefined) upsert.run('ai_model', body.ai_model);
    if (body.ai_api_key !== undefined) upsert.run('ai_api_key', body.ai_api_key);
    if (body.ai_context_window !== undefined) upsert.run('ai_context_window', body.ai_context_window.toString());
    if (body.ai_keep_loaded !== undefined) upsert.run('ai_keep_loaded', body.ai_keep_loaded.toString());
    if (body.ai_adult_content !== undefined) upsert.run('ai_adult_content', body.ai_adult_content ? 'true' : 'false');
    if (body.ai_timeout !== undefined) upsert.run('ai_timeout', body.ai_timeout.toString());

    // Save SMTP settings
    console.log('Saving SMTP settings:', body.smtp_host, body.smtp_user, body.smtp_from, body.smtp_tls);
    if (body.smtp_host !== undefined) upsert.run('smtp_host', body.smtp_host);
    if (body.smtp_port !== undefined) upsert.run('smtp_port', body.smtp_port);
    if (body.smtp_user !== undefined) upsert.run('smtp_user', body.smtp_user);
    if (body.smtp_pass !== undefined) upsert.run('smtp_pass', body.smtp_pass);
    if (body.smtp_from !== undefined) upsert.run('smtp_from', body.smtp_from);
    if (body.smtp_tls !== undefined) upsert.run('smtp_tls', body.smtp_tls ? 'true' : 'false');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}