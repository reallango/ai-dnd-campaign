// GET /api/admin/roles - list all roles
// POST /api/admin/roles - create new role

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { AgentRole } from '@/lib/ai/types';

export async function GET(request: NextRequest) {
  try {
    const database = db as any;
    
    const roles = database.prepare(`
      SELECT * FROM agent_roles ORDER BY sort_order
    `).all() as AgentRole[];

    // Get assignments and parameters for each role
    const rolesWithDetails = roles.map(role => {
      const assignment = database.prepare(`
        SELECT ra.*, am.model_tag, am.display_name as model_display_name,
               oi.name as instance_name, oi.base_url as instance_base_url
        FROM role_assignments ra
        JOIN available_models am ON ra.model_id = am.id
        JOIN ollama_instances oi ON am.instance_id = oi.id
        WHERE ra.role_id = ? AND ra.is_active = 1
        ORDER BY ra.priority ASC
        LIMIT 1
      `).get(role.id);

      const parameters = database.prepare(`
        SELECT * FROM role_parameters WHERE role_id = ?
      `).get(role.id);

      const activePrompt = database.prepare(`
        SELECT * FROM system_prompts WHERE role_id = ? AND is_active = 1
      `).get(role.id);

      return {
        ...role,
        assignment,
        parameters,
        activePrompt
      };
    });

    return NextResponse.json({ roles: rolesWithDetails });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role_key, display_name, description, icon } = body;

    if (!role_key || !display_name) {
      return NextResponse.json({ error: 'role_key and display_name are required' }, { status: 400 });
    }

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if role_key already exists
    const existing = database.prepare('SELECT id FROM agent_roles WHERE role_key = ?').get(role_key);
    if (existing) {
      return NextResponse.json({ error: 'Role with this key already exists' }, { status: 400 });
    }

    // Get max sort order
    const maxOrder = database.prepare('SELECT MAX(sort_order) as max FROM agent_roles').get() as { max: number } | undefined;
    const sortOrder = (maxOrder?.max || 0) + 1;

    // Insert role
    const result = database.prepare(`
      INSERT INTO agent_roles (role_key, display_name, description, icon, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(role_key, display_name, description || null, icon || null, sortOrder, currentTime);

    const roleId = result.lastInsertRowid;

    // Create default parameters
    database.prepare(`
      INSERT INTO role_parameters (role_id, temperature, top_p, top_k, repeat_penalty, num_ctx, response_format, keep_alive)
      VALUES (?, 0.7, 0.9, 40, 1.1, 4096, 'text', '10m')
    `).run(roleId);

    const role = database.prepare('SELECT * FROM agent_roles WHERE id = ?').get(roleId) as AgentRole;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}