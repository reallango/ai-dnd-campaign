import { NextResponse } from 'next/server';
import { detectPortainerApiUrl, getPortainerUrl, isPortainerAvailable } from '@/src/server/portainerDiscovery';

// POST /api/portainer/detect - force re-detect Portainer URL
export async function POST() {
  try {
    const url = await detectPortainerApiUrl();

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to detect Portainer',
        url: getPortainerUrl(),
      },
      { status: 500 }
    );
  }
}

// GET /api/portainer/detect - check detection status
export async function GET() {
  return NextResponse.json({
    detected: isPortainerAvailable(),
    url: getPortainerUrl(),
  });
}