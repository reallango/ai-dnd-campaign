import { NextRequest, NextResponse } from 'next/server';
import { orchestrate } from '@/lib/ai/orchestrator';
import { routeTask } from '@/lib/ai/router';
import { checkAIAvailability } from '@/lib/ai';


// POST /api/ai - Generate AI response via multi-agent orchestration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, type, campaignId, sessionId, maxTokens, game_system_id } = body;
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    // Use orchestrator for game actions (narrative, combat, npc interactions)
    // Use direct routeTask for explicit agent testing or non-game requests
    if (type === 'direct' && body.roleKey) {
      // Direct mode: bypass orchestrator, call specific agent (used by admin test)
      const result = await routeTask(body.roleKey, prompt, 
        campaignId ? { campaignId: parseInt(campaignId), sessionId: sessionId ? parseInt(sessionId) : undefined, gameSystemId: game_system_id ? parseInt(game_system_id) : undefined } : undefined, 
        undefined, maxTokens);
      return NextResponse.json({
        content: result.content,
        model: result.model,
        instance: result.instance,
        agent: body.roleKey,
      });
    }
    
    // Orchestrated mode: DM classifies, then routes to appropriate agent
    const gameContext = campaignId
      ? { campaignId: parseInt(campaignId), sessionId: sessionId ? parseInt(sessionId) : undefined, gameSystemId: game_system_id ? parseInt(game_system_id) : undefined }
      : undefined;
    
    const result = await orchestrate(prompt, gameContext, maxTokens);
    
    return NextResponse.json({
      content: result.content,
      model: result.model,
      instance: result.instance,
      agent: result.agent,
      classification: result.classification,
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