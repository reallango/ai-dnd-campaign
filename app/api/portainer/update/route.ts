import { NextResponse } from 'next/server';
import { applyUpdate, initPortainer } from '@/lib/portainerService';

// Initialize on first request
let initialized = false;

export async function POST() {
  try {
    // Initialize on first call if not done
    if (!initialized) {
      await initPortainer();
      initialized = true;
    }

    const result = await applyUpdate();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/portainer/update:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    );
  }
}