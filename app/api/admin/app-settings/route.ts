// GET /api/admin/app-settings - list all app settings
// PUT /api/admin/app-settings/[key] - update a setting

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { AppSetting } from '@/lib/ai/types';

export async function GET(request: NextRequest) {
  try {
    const database = db as any;
    
    const settings = database.prepare(`
      SELECT * FROM app_settings ORDER BY key
    `).all() as AppSetting[];

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}