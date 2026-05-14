// GET /api/admin/assignments - list all assignments
// POST /api/admin/assignments - create new assignment

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { RoleAssignment } from '@/lib/ai/types';

export async function GET(request: NextRequest) {
  try {
    const database = db as any;
    
    const assignments = database.prepare(`
      SELECT ra.*, 
             ar.role_key, ar.display_name as role_display_name,
             am.model_tag, am.display_name as model_display_name,
             oi.name as instance_name
      FROM role_assignments ra
      JOIN agent_roles ar ON ra.role_id = ar.id
      JOIN available_models am ON ra.model_id = am.id
      JOIN ollama_instances oi ON am.instance_id = oi.id
      ORDER BY ar.sort_order, ra.priority
    `).all();

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role_id, model_id, priority } = body;

    if (!role_id || !model_id) {
      return NextResponse.json({ error: 'role_id and model_id are required' }, { status: 400 });
    }

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if role exists
    const role = database.prepare('SELECT id FROM agent_roles WHERE id = ?').get(role_id);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if model exists
    const model = database.prepare('SELECT id FROM available_models WHERE id = ?').get(model_id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Check for existing assignment with this role/priority combo
    const existingPriority = database.prepare(`
      SELECT id FROM role_assignments WHERE role_id = ? AND priority = ?
    `).get(role_id, priority || 1);

    // If priority slot taken, shift others
    if (existingPriority) {
      database.prepare(`
        UPDATE role_assignments SET priority = priority + 1 
        WHERE role_id = ? AND priority >= ?
      `).run(role_id, priority || 1);
    }

    // Insert assignment
    const result = database.prepare(`
      INSERT INTO role_assignments (role_id, model_id, priority, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(role_id, model_id, priority || 1, currentTime, currentTime);

    const assignmentId = result.lastInsertRowid;

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
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}