import { NextResponse } from 'next/server';
import { detectPortainerApiUrl } from '@/src/server/portainerDiscovery';
import { findTargetStack, getWebhooksForStack } from '@/src/server/portainerClient';

// GET /api/portainer/stack - Returns target stack info
export async function GET() {
  try {
    // Ensure we can reach Portainer
    await detectPortainerApiUrl();
    
    // Find the target stack
    const stack = await findTargetStack();
    
    if (!stack) {
      return NextResponse.json(
        { error: 'Stack not found. Set PORTAINER_STACK_ID or PORTAINER_STACK_NAME.' },
        { status: 404 }
      );
    }
    
    // Get webhooks for this stack
    const webhooks = await getWebhooksForStack(stack.Id);
    
    return NextResponse.json({
      id: stack.Id,
      name: stack.Name,
      webhooks: stack.AutoUpdate?.Webhook ? [stack.AutoUpdate.Webhook] : [],
      repositoryUrl: stack.RepositoryURL,
      branch: stack.RepositoryReferenceName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stack' },
      { status: 500 }
    );
  }
}