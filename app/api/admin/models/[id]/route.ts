// PUT /api/admin/models/[id] - update model metadata

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { display_name, vram_required_mb, quantization } = body;

    const database = db as any;

    // Check if model exists
    const existing = database.prepare('SELECT id FROM available_models WHERE id = ?').get(modelId);
    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Update model
    database.prepare(`
      UPDATE available_models 
      SET display_name = COALESCE(?, display_name),
          vram_required_mb = COALESCE(?, vram_required_mb),
          quantization = COALESCE(?, quantization)
      WHERE id = ?
    `).run(display_name, vram_required_mb, quantization, modelId);

    const model = database.prepare(`
      SELECT am.*, oi.name as instance_name
      FROM available_models am
      JOIN ollama_instances oi ON am.instance_id = oi.id
      WHERE am.id = ?
    `).get(modelId);

    return NextResponse.json({ model });
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}