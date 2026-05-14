// PUT /api/admin/roles/[id] - update role
// DELETE /api/admin/roles/[id] - delete role

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { AgentRole } from '@/lib/ai/types';

// Default seed roles that cannot be deleted
const SEED_ROLES = ['dm', 'narrator', 'combat', 'npc', 'state', 'character'];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = parseInt(id, 10);

  try {
    const database = db as any;
    
    const role = database.prepare('SELECT * FROM agent_roles WHERE id = ?').get(roleId) as AgentRole | undefined;

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Get all assignments
    const assignments = database.prepare(`
      SELECT ra.*, am.model_tag, am.display_name as model_display_name,
             oi.name as instance_name, oi.base_url as instance_base_url
      FROM role_assignments ra
      JOIN available_models am ON ra.model_id = am.id
      JOIN ollama_instances oi ON am.instance_id = oi.id
      WHERE ra.role_id = ?
      ORDER BY ra.priority ASC
    `).all(roleId);

    // Get all parameters
    const parameters = database.prepare(`
      SELECT * FROM role_parameters WHERE role_id = ?
    `).get(roleId);

    // Get all prompts
    const prompts = database.prepare(`
      SELECT * FROM system_prompts WHERE role_id = ?
      ORDER BY version DESC
    `).all(roleId);

    return NextResponse.json({ role, assignments, parameters, prompts });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { display_name, description, icon, is_active } = body;

    const database = db as any;

    // Check if role exists
    const existing = database.prepare('SELECT id, role_key FROM agent_roles WHERE id = ?').get(roleId) as { id: number; role_key: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Update role
    database.prepare(`
      UPDATE agent_roles 
      SET display_name = COALESCE(?, display_name),
          description = COALESCE(?, description),
          icon = COALESCE(?, icon),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(display_name, description, icon, is_active, roleId);

    const role = database.prepare('SELECT * FROM agent_roles WHERE id = ?').get(roleId) as AgentRole;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = parseInt(id, 10);

  try {
    const database = db as any;

    // Check if role exists and is a seed role
    const existing = database.prepare('SELECT id, role_key FROM agent_roles WHERE id = ?').get(roleId) as { id: number; role_key: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (SEED_ROLES.includes(existing.role_key)) {
      return NextResponse.json({ error: 'Cannot delete default seed role' }, { status: 400 });
    }

    // Delete role (cascades to assignments, parameters, prompts)
    database.prepare('DELETE FROM agent_roles WHERE id = ?').run(roleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}