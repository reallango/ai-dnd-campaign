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
    };

    return NextResponse.json({
      ai_provider: settings.ai_provider || defaults.ai_provider,
      ai_base_url: settings.ai_base_url || defaults.ai_base_url,
      ai_model: settings.ai_model || defaults.ai_model,
      ai_api_key: settings.ai_api_key || defaults.ai_api_key,
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
    const { ai_provider, ai_base_url, ai_model, ai_api_key } = body;

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const save = db.transaction((settings: Record<string, string>) => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(key, value);
      }
    });

    save({ ai_provider, ai_base_url, ai_model, ai_api_key: ai_api_key || '' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}