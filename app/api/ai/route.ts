import { NextRequest, NextResponse } from 'next/server';
import { routeTask } from '@/lib/ai/router';
import { checkAIAvailability } from '@/lib/ai';

// POST /api/ai - Generate AI response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, type, campaignId, sessionId, maxTokens } = body;
    
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    
    // Map type to agent role
    const roleMap: Record<string, string> = {
      'narrative': 'narrator',
      'npc': 'npc',
      'combat': 'combat',
      'character_creation': 'character',
      'world': 'narrator',
      'state': 'state',
    };
    const roleKey = roleMap[type || ''] || 'dm';
    
    // Build game context if campaign provided
    const gameContext = campaignId
      ? { campaignId: parseInt(campaignId), sessionId: sessionId ? parseInt(sessionId) : undefined }
      : undefined;
    
    const result = await routeTask(roleKey, prompt, gameContext, undefined, maxTokens);
    
    return NextResponse.json({
      content: result.content,
      model: result.model,
      instance: result.instance,
      role: roleKey,
    });
  } catch (error) {
    console.error('AI error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'AI generation failed' 
    }, { status: 500 });
  }
}

// GET /api/ai - Check AI availability
export async function GET() {
  try {
    const status = await checkAIAvailability();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Check failed' 
    }, { status: 500 });
  }
}