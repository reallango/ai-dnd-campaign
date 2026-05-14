// PUT /api/admin/assignments/[id] - update assignment
// DELETE /api/admin/assignments/[id] - delete assignment

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { RoleAssignment } from '@/lib/ai/types';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assignmentId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { model_id, priority, is_active } = body;

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if assignment exists
    const existing = database.prepare('SELECT id FROM role_assignments WHERE id = ?').get(assignmentId);
    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // If changing model, verify it exists
    if (model_id) {
      const model = database.prepare('SELECT id FROM available_models WHERE id = ?').get(model_id);
      if (!model) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      }
    }

    // Update assignment
    database.prepare(`
      UPDATE role_assignments 
      SET model_id = COALESCE(?, model_id),
          priority = COALESCE(?, priority),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `).run(model_id, priority, is_active, currentTime, assignmentId);

    const assignment = database.prepare(`
      SELECT ra.*, ar.role_key, ar.display_name as role_display_name,
             am.model_tag, am.display_name as model_display_name,
             oi.name as instance_name
      FROM role_assignments ra
      JOIN agent_roles ar ON ra.role_id = ar.id
      JOIN available_models am ON ra.model_id = am.id
      JOIN ollama_instances oi ON am.instance_id = oi.id
      WHERE ra.id = ?
    `).get(assignmentId) as RoleAssignment;

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assignmentId = parseInt(id, 10);

  try {
    const database = db as any;

    // Check if assignment exists
    const existing = database.prepare('SELECT id, role_id FROM role_assignments WHERE id = ?').get(assignmentId) as { id: number; role_id: number } | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get priority before delete for reordering
    const assignment = database.prepare('SELECT priority FROM role_assignments WHERE id = ?').get(assignmentId) as { priority: number } | undefined;

    // Delete assignment
    database.prepare('DELETE FROM role_assignments WHERE id = ?').run(assignmentId);

    // Reorder remaining priorities
    if (assignment) {
      database.prepare(`
        UPDATE role_assignments SET priority = priority - 1 
        WHERE role_id = ? AND priority > ?
      `).run(existing.role_id, assignment.priority);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}