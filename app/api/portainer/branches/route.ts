import { NextResponse } from 'next/server';
import { getBranches, initPortainer, getStackInfo, isPortainerApiAvailable } from '@/lib/portainerService';
import { detectPortainerApiUrl, getPortainerUrl } from '@/lib/portainerDiscovery';

// Initialize on first request
let initialized = false;

// GET /api/portainer/branches - get branches and status
export async function GET() {
  try {
    // Check if API is available first
    if (!isPortainerApiAvailable()) {
      return NextResponse.json({
        error: 'Portainer API not detected',
        available: false,
        detectedUrl: getPortainerUrl(),
        currentBranch: null,
        pendingBranch: null,
        availableBranches: [],
      });
    }

    // Initialize on first call if not done
    if (!initialized) {
      await initPortainer();
      initialized = true;
    }

    const branchInfo = await getBranches();

    return NextResponse.json({
      available: true,
      detectedUrl: getPortainerUrl(),
      ...branchInfo,
    });
  } catch (error) {
    console.error('Error in /api/portainer/branches:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get branches',
        available: false,
        detectedUrl: getPortainerUrl(),
      },
      { status: 500 }
    );
  }
}