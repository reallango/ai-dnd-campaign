// GET /api/admin/parameters/[roleId] - get parameters for a role
// PUT /api/admin/parameters/[roleId] - update parameters

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { RoleParameters } from '@/lib/ai/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const roleIdNum = parseInt(roleId, 10);

  try {
    const database = db as any;
    
    const parameters = database.prepare(`
      SELECT rp.*, ar.role_key, ar.display_name as role_display_name
      FROM role_parameters rp
      JOIN agent_roles ar ON rp.role_id = ar.id
      WHERE rp.role_id = ?
    `).get(roleIdNum) as (RoleParameters & { role_display_name: string }) | undefined;

    if (!parameters) {
      return NextResponse.json({ error: 'Parameters not found' }, { status: 404 });
    }

    return NextResponse.json({ parameters });
  } catch (error) {
    console.error('Error fetching parameters:', error);
    return NextResponse.json({ error: 'Failed to fetch parameters' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const roleIdNum = parseInt(roleId, 10);

  try {
    const body = await request.json();
    const { temperature, top_p, top_k, repeat_penalty, num_ctx, response_format, keep_alive, max_tokens } = body;

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if role exists
    const role = database.prepare('SELECT id FROM agent_roles WHERE id = ?').get(roleIdNum);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Update parameters
    database.prepare(`
      UPDATE role_parameters 
      SET temperature = COALESCE(?, temperature),
          top_p = COALESCE(?, top_p),
          top_k = COALESCE(?, top_k),
          repeat_penalty = COALESCE(?, repeat_penalty),
          num_ctx = COALESCE(?, num_ctx),
          response_format = COALESCE(?, response_format),
          keep_alive = COALESCE(?, keep_alive),
          max_tokens = ?,
          updated_at = ?
      WHERE role_id = ?
    `).run(temperature, top_p, top_k, repeat_penalty, num_ctx, response_format, keep_alive, max_tokens ?? null, currentTime, roleIdNum);

    const parameters = database.prepare(`
      SELECT rp.*, ar.role_key, ar.display_name as role_display_name
      FROM role_parameters rp
      JOIN agent_roles ar ON rp.role_id = ar.id
      WHERE rp.role_id = ?
    `).get(roleIdNum) as RoleParameters;

    return NextResponse.json({ parameters });
  } catch (error) {
    console.error('Error updating parameters:', error);
    return NextResponse.json({ error: 'Failed to update parameters' }, { status: 500 });
  }
}