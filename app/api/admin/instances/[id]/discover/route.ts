// POST /api/admin/instances/[id]/discover - trigger model discovery

import { NextRequest, NextResponse } from 'next/server';
import { discoverModels } from '@/lib/ai/discovery';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instanceId = parseInt(id, 10);

  try {
    const result = await discoverModels(instanceId);
    return NextResponse.json({ 
      success: true, 
      discovered: result.discovered,
      errors: result.errors
    });
  } catch (error) {
    console.error('Discovery error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Discovery failed' 
    }, { status: 500 });
  }
}