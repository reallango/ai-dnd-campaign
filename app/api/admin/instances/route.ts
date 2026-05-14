// GET /api/admin/instances - list all instances
// POST /api/admin/instances - create new instance

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { discoverModels } from '@/lib/ai/discovery';
import { checkInstanceHealth } from '@/lib/ai/health';
import type { OllamaInstance } from '@/lib/ai/types';

export async function GET(request: NextRequest) {
  try {
    const database = db as any;
    
    const instances = database.prepare(`
      SELECT oi.*, 
        (SELECT COUNT(*) FROM available_models WHERE instance_id = oi.id AND is_available = 1) as model_count
      FROM ollama_instances oi
      ORDER BY oi.name
    `).all();

    return NextResponse.json({ instances });
  } catch (error) {
    console.error('Error fetching instances:', error);
    return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, base_url, description } = body;

    if (!name || !base_url) {
      return NextResponse.json({ error: 'Name and base_url are required' }, { status: 400 });
    }

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if URL already exists
    const existing = database.prepare('SELECT id FROM ollama_instances WHERE base_url = ?').get(base_url);
    if (existing) {
      return NextResponse.json({ error: 'Instance with this URL already exists' }, { status: 400 });
    }

    // Insert new instance
    const result = database.prepare(`
      INSERT INTO ollama_instances (name, base_url, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, base_url, description || null, currentTime, currentTime);

    const instanceId = result.lastInsertRowid;

    // Trigger health check and model discovery
    try {
      await checkInstanceHealth(instanceId as number);
      await discoverModels(instanceId as number);
    } catch (e) {
      console.error('Initial discovery error:', e);
    }

    // Get the created instance
    const instance = database.prepare('SELECT * FROM ollama_instances WHERE id = ?').get(instanceId) as OllamaInstance;

    return NextResponse.json({ instance });
  } catch (error) {
    console.error('Error creating instance:', error);
    return NextResponse.json({ error: 'Failed to create instance' }, { status: 500 });
  }
}