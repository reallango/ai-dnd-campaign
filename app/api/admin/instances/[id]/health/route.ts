// POST /api/admin/instances/[id]/health - trigger health check

import { NextRequest, NextResponse } from 'next/server';
import { checkInstanceHealth } from '@/lib/ai/health';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instanceId = parseInt(id, 10);

  try {
    const result = await checkInstanceHealth(instanceId);
    return NextResponse.json({ 
      success: true, 
      status: result.status,
      error: result.error
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Health check failed' 
    }, { status: 500 });
  }
}