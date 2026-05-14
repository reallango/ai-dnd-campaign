// PUT /api/admin/prompts/[roleId]/activate/[promptId] - activate a specific prompt version

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { SystemPrompt } from '@/lib/ai/types';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ roleId: string; promptId: string }> }) {
  const { roleId, promptId } = await params;
  const roleIdNum = parseInt(roleId, 10);
  const promptIdNum = parseInt(promptId, 10);

  try {
    const database = db as any;

    // Check if prompt exists and belongs to role
    const prompt = database.prepare(`
      SELECT id FROM system_prompts WHERE id = ? AND role_id = ?
    `).get(promptIdNum, roleIdNum) as { id: number } | undefined;
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Deactivate all other prompts for this role
    database.prepare(`
      UPDATE system_prompts SET is_active = 0 WHERE role_id = ? AND is_active = 1
    `).run(roleIdNum);

    // Activate the selected prompt
    database.prepare(`
      UPDATE system_prompts SET is_active = 1 WHERE id = ?
    `).run(promptIdNum);

    const updatedPrompt = database.prepare(`
      SELECT sp.*, ar.role_key, ar.display_name as role_display_name
      FROM system_prompts sp
      JOIN agent_roles ar ON sp.role_id = ar.id
      WHERE sp.id = ?
    `).get(promptIdNum) as SystemPrompt;

    return NextResponse.json({ prompt: updatedPrompt });
  } catch (error) {
    console.error('Error activating prompt:', error);
    return NextResponse.json({ error: 'Failed to activate prompt' }, { status: 500 });
  }
}