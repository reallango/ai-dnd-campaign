import { NextResponse } from 'next/server';
import { detectPortainerApiUrlWithStatus, getPortainerUrl } from '@/src/server/portainerDiscovery';

// GET /api/portainer/status - Returns Portainer connectivity status with structured errors
export async function GET() {
  const result = await detectPortainerApiUrlWithStatus();
  
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      reachable: true,
      apiUrl: result.url,
      error: null,
      missingEnv: null,
    });
  }
  
  return NextResponse.json({
    ok: false,
    reachable: false,
    apiUrl: null,
    error: result.error,
    missingEnv: result.missingEnv ?? null,
  });
}