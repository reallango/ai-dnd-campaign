import { NextResponse } from 'next/server';
import { detectPortainerApiUrl } from '@/src/server/portainerDiscovery';
import { findTargetStack, StackResult, StackFound, StackError } from '@/src/server/portainerClient';

// GET /api/portainer/stack - Returns target stack info
export async function GET() {
  try {
    // Validate API URL detection first
    await detectPortainerApiUrl();
    
    // Find the target stack
    const result = await findTargetStack();
    
    if (!result.ok) {
      // Return structured error
      return NextResponse.json({
        ok: false,
        error: result.error,
        missingEnv: result.missingEnv,
      });
    }
    
    // Success - return stack info
    return NextResponse.json({
      ok: true,
      id: result.id,
      name: result.name,
      repoUrl: result.repoUrl,
      branch: result.branch,
      webhooks: result.webhooks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stack' },
      { status: 500 }
    );
  }
}