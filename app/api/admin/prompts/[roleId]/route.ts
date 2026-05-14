// GET /api/admin/prompts/[roleId] - list all prompts for a role
// POST /api/admin/prompts/[roleId] - create new prompt version

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { SystemPrompt } from '@/lib/ai/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const roleIdNum = parseInt(roleId, 10);

  try {
    const database = db as any;
    
    const prompts = database.prepare(`
      SELECT sp.*, ar.role_key, ar.display_name as role_display_name
      FROM system_prompts sp
      JOIN agent_roles ar ON sp.role_id = ar.id
      WHERE sp.role_id = ?
      ORDER BY sp.version DESC
    `).all(roleIdNum) as (SystemPrompt & { role_display_name: string })[];

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const roleIdNum = parseInt(roleId, 10);

  try {
    const body = await request.json();
    const { prompt_text, notes, created_by } = body;

    if (!prompt_text) {
      return NextResponse.json({ error: 'prompt_text is required' }, { status: 400 });
    }

    const database = db as any;
    const currentTime = new Date().toISOString();

    // Check if role exists
    const role = database.prepare('SELECT id FROM agent_roles WHERE id = ?').get(roleIdNum);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Get current max version
    const maxVersion = database.prepare(`
      SELECT MAX(version) as max FROM system_prompts WHERE role_id = ?
    `).get(roleIdNum) as { max: number } | undefined;
    
    const newVersion = (maxVersion?.max || 0) + 1;

    // Deactivate current active prompt
    database.prepare(`
      UPDATE system_prompts SET is_active = 0 WHERE role_id = ? AND is_active = 1
    `).run(roleIdNum);

    // Insert new prompt
    const result = database.prepare(`
      INSERT INTO system_prompts (role_id, prompt_text, version, is_active, notes, created_by, created_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(roleIdNum, prompt_text, newVersion, notes || null, created_by || null, currentTime);

    const promptId = result.lastInsertRowid;

    const prompt = database.prepare(`
      SELECT sp.*, ar.role_key, ar.display_name as role_display_name
      FROM system_prompts sp
      JOIN agent_roles ar ON sp.role_id = ar.id
      WHERE sp.id = ?
    `).get(promptId) as SystemPrompt;

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}