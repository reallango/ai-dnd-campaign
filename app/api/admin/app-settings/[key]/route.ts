// PUT /api/admin/app-settings/[key] - update a specific setting

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { AppSetting } from '@/lib/ai/types';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  try {
    const body = await request.json();
    const { value, description } = body;

    if (value === undefined) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 });
    }

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Upsert setting
    database.prepare(`
      INSERT INTO app_settings (key, value, description, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = COALESCE(excluded.description, app_settings.description), updated_at = excluded.updated_at
    `).run(key, value, description ?? null, currentTime);

    const setting = database.prepare('SELECT * FROM app_settings WHERE key = ?').get(key) as AppSetting;

    // If health_check_interval_sec changed, restart health checks
    if (key === 'health_check_interval_sec') {
      const { restartHealthChecks } = await import('@/lib/ai/health');
      restartHealthChecks();
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}