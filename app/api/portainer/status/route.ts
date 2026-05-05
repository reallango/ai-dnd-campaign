import { NextResponse } from 'next/server';
import { detectPortainerApiUrl, isPortainerAvailable, getPortainerUrl } from '@/src/server/portainerDiscovery';

// GET /api/portainer/status - Returns Portainer connectivity status
export async function GET() {
  try {
    // Try to detect/determine URL
    const apiUrl = await detectPortainerApiUrl();
    
    return NextResponse.json({
      reachable: true,
      apiUrl,
      error: null,
    });
  } catch (error) {
    return NextResponse.json({
      reachable: false,
      apiUrl: getPortainerUrl(),
      error: error instanceof Error ? error.message : 'Unable to connect to Portainer',
    });
  }
}