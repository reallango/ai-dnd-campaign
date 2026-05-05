import { NextResponse } from 'next/server';
import { getBranches, initPortainer } from '@/lib/portainerService';

// Initialize on first request
let initialized = false;

export async function GET() {
  try {
    // Initialize on first call if not done
    if (!initialized) {
      await initPortainer();
      initialized = true;
    }

    const branchInfo = await getBranches();

    return NextResponse.json(branchInfo);
  } catch (error) {
    console.error('Error in /api/portainer/branches:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get branches' },
      { status: 500 }
    );
  }
}