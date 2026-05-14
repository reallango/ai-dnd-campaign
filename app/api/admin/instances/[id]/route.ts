// PUT /api/admin/instances/[id] - update instance
// DELETE /api/admin/instances/[id] - delete instance
// POST /api/admin/instances/[id]/discover - trigger model discovery
// POST /api/admin/instances/[id]/health - trigger health check

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { discoverModels } from '@/lib/ai/discovery';
import { checkInstanceHealth } from '@/lib/ai/health';
import type { OllamaInstance } from '@/lib/ai/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instanceId = parseInt(id, 10);

  try {
    const database = db as any;
    
    const instance = database.prepare(`
      SELECT oi.*, 
        (SELECT COUNT(*) FROM available_models WHERE instance_id = oi.id AND is_available = 1) as model_count
      FROM ollama_instances oi
      WHERE oi.id = ?
    `).get(instanceId);

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Get associated models
    const models = database.prepare(`
      SELECT * FROM available_models 
      WHERE instance_id = ?
      ORDER BY model_tag
    `).all(instanceId);

    return NextResponse.json({ instance, models });
  } catch (error) {
    console.error('Error fetching instance:', error);
    return NextResponse.json({ error: 'Failed to fetch instance' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instanceId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { name, base_url, description, is_active } = body;

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if instance exists
    const existing = database.prepare('SELECT id FROM ollama_instances WHERE id = ?').get(instanceId);
    if (!existing) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Check if base_url is taken by another instance
    if (base_url) {
      const duplicate = database.prepare('SELECT id FROM ollama_instances WHERE base_url = ? AND id != ?').get(base_url, instanceId);
      if (duplicate) {
        return NextResponse.json({ error: 'Instance with this URL already exists' }, { status: 400 });
      }
    }

    // Update instance
    database.prepare(`
      UPDATE ollama_instances 
      SET name = COALESCE(?, name),
          base_url = COALESCE(?, base_url),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `).run(name, base_url, description, is_active, currentTime, instanceId);

    const instance = database.prepare('SELECT * FROM ollama_instances WHERE id = ?').get(instanceId) as OllamaInstance;

    return NextResponse.json({ instance });
  } catch (error) {
    console.error('Error updating instance:', error);
    return NextResponse.json({ error: 'Failed to update instance' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instanceId = parseInt(id, 10);

  try {
    const database = db as any;

    // Check if instance exists
    const existing = database.prepare('SELECT id FROM ollama_instances WHERE id = ?').get(instanceId);
    if (!existing) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Delete instance (cascades to models and assignments)
    database.prepare('DELETE FROM ollama_instances WHERE id = ?').run(instanceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting instance:', error);
    return NextResponse.json({ error: 'Failed to delete instance' }, { status: 500 });
  }
}