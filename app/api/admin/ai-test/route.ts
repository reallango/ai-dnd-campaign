// POST /api/admin/ai-test - test an agent with a custom prompt

import { NextRequest, NextResponse } from 'next/server';
import { testAgent } from '@/lib/ai/router';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roleKey, testPrompt } = body;

    if (!roleKey || !testPrompt) {
      return NextResponse.json({ error: 'roleKey and testPrompt are required' }, { status: 400 });
    }

    const result = await testAgent(roleKey, testPrompt);

    if (result.error) {
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        roleKey,
        testPrompt
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      content: result.content,
      model: result.model,
      instance: result.instance,
      roleKey,
      testPrompt
    });
  } catch (error) {
    console.error('Error testing agent:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Test failed' 
    }, { status: 500 });
  }
}