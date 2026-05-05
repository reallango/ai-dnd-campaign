import { NextResponse } from 'next/server';
import { detectPortainerApiUrl } from '@/src/server/portainerDiscovery';
import { findTargetStack, triggerStackUpdate, triggerWebhookUpdate, Stack } from '@/src/server/portainerClient';

interface UpdateRequest {
  branch: string;
}

// POST /api/portainer/update - Trigger stack update for a branch
export async function POST(request: Request) {
  try {
    let body: UpdateRequest;
    try {
      body = await request.json() as UpdateRequest;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { branch } = body;
    if (!branch || typeof branch !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing branch parameter' },
        { status: 400 }
      );
    }
    
    // Ensure Portainer is reachable
    await detectPortainerApiUrl();
    
    // Find target stack
    const stack = await findTargetStack();
    
    if (!stack) {
      return NextResponse.json(
        { ok: false, error: 'Stack not found. Set PORTAINER_STACK_ID or PORTAINER_STACK_NAME.' },
        { status: 404 }
      );
    }
    
    // Try webhook first if available
    if (stack.AutoUpdate?.Webhook) {
      try {
        await triggerWebhookUpdate(stack.AutoUpdate.Webhook);
        return NextResponse.json({
          ok: true,
          message: `Triggered webhook for branch: ${branch}`,
        });
      } catch (webhookError) {
        console.warn('Webhook failed, trying API:', webhookError);
        // Fall through to try API
      }
    }
    
    // Try API update
    try {
      await triggerStackUpdate(stack.Id, branch);
      return NextResponse.json({
        ok: true,
        message: `Updated stack to branch: ${branch}`,
      });
    } catch (apiError) {
      return NextResponse.json(
        { 
          ok: false, 
          error: apiError instanceof Error ? apiError.message : 'Failed to update stack' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}