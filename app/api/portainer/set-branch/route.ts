import { NextResponse } from 'next/server';
import { setPendingBranch, initPortainer } from '@/lib/portainerService';

// Initialize on first request
let initialized = false;

export async function POST(request: Request) {
  try {
    // Initialize on first call if not done
    if (!initialized) {
      await initPortainer();
      initialized = true;
    }

    const body = await request.json();
    const { branch } = body;

    if (!branch) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }

    const result = setPendingBranch(branch);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/portainer/set-branch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set branch' },
      { status: 500 }
    );
  }
}