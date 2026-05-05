import { NextResponse } from 'next/server';
import { detectPortainerApiUrl } from '@/src/server/portainerDiscovery';
import { findTargetStack, triggerStackUpdate, triggerWebhookUpdate, StackResult, StackFound } from '@/src/server/portainerClient';

interface UpdateRequest {
  branch: string;
}

// POST /api/portainer/update - Trigger stack update for a branch
export async function POST(request: Request) {
  // 1. Validate branch is provided
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
  if (!branch || typeof branch !== 'string' || !branch.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Missing branch parameter' },
      { status: 400 }
    );
  }
  
  // 2. Validate token exists
  if (!process.env.PORTAINER_API_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'Missing Portainer API token', missingEnv: ['PORTAINER_API_TOKEN'] },
      { status: 400 }
    );
  }
  
  // 3. Validate API URL detection succeeded
  try {
    await detectPortainerApiUrl();
  } catch (error) {
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unable to detect Portainer API URL',
        missingEnv: ['PORTAINER_API_URL'] 
      },
      { status: 400 }
    );
  }
  
  // 4. Validate stack detection succeeded
  const stackResult = await findTargetStack();
  
  if (!stackResult.ok) {
    return NextResponse.json({
      ok: false,
      error: stackResult.error,
      missingEnv: stackResult.missingEnv ?? null,
    });
  }
  
  const stack = stackResult as StackFound;
  
  // 5. Trigger update via webhook or API
  try {
    if (stack.webhooks && stack.webhooks.length > 0) {
      try {
        await triggerWebhookUpdate(stack.webhooks[0]);
        return NextResponse.json({
          ok: true,
          message: `Triggered webhook for branch: ${branch}`,
        });
      } catch (webhookError) {
        console.warn('Webhook failed, trying API:', webhookError);
        // Fall through to try API
      }
    }
    
    await triggerStackUpdate(stack.id, branch);
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
}