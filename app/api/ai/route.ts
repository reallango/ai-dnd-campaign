import { NextRequest, NextResponse } from 'next/server';
import { callAI, checkAIAvailability } from '@/lib/ai';

// POST /api/ai - Generate AI response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, system, type, context, maxTokens, temperature } = body;
    
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    
    // Build system prompt based on type
    let systemPrompt = system || getDefaultSystemPrompt(type);
    
    // Add context if provided
    if (context) {
      systemPrompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }
    
    const response = await callAI({
      prompt,
      system: systemPrompt,
      maxTokens: Math.min(maxTokens || 500, 512),  // Cap at 512 tokens for speed
      temperature: temperature ?? 0.7,
      // contextWindow and keepLoaded will come from config (database/env)
    });
    
    return NextResponse.json({ 
      content: response.content,
      model: response.model
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
    console.error('AI availability check error:', error);
    return NextResponse.json({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Check failed' 
    }, { status: 500 });
  }
}

function getDefaultSystemPrompt(type?: string): string {
  switch (type) {
    case 'narrative':
      return `You are an expert Dungeons & Dragons Dungeon Master. Your role is to craft immersive, vivid narratives that bring the fantasy world to life. Write in a descriptive, evocative style that engages all the senses. Present action scenes with energy and stakes, mystery with intrigue, and combat with tactical clarity. Always leave players with meaningful choices that affect the story. Keep descriptions concise but impactful.`;
    
    case 'npc':
      return `You are an expert D&D NPC (Non-Player Character) generator. Create unique, memorable NPCs with distinct personalities, appearances, and backstories. Give each NPC a clear motivation and use speech patterns that reflect their personality. Include both physical descriptions and personality traits.`;
    
    case 'combat':
      return `You are a D&D combat specialist. Generate exciting, balanced combat encounters. Account for party level and composition. Describe combat/actions cinematically with stakes and impact. Keep tactical narration concise.`;
    
    case 'character_creation':
      return `You are a D&D character creation assistant. Ask the player engaging questions about their character concept, then help them build a character. Guide them through race, class, background, and stats in an interactive way. Be encouraging and creative.`;
    
    case 'world':
      return `You are a D&D world-building expert. Create rich, detailed locations, factions, and lore. Make the world feel lived-in and interconnected. Think like a novelist with history, politics, and culture.`;
    
    default:
      return `You are an expert Dungeons & Dragons Dungeon Master. Your role is to craft immersive, vivid narratives. Write in a descriptive, evocative style. Present action scenes with energy, mystery with intrigue, and combat with tactical clarity. Always leave players with meaningful choices that affect the story.`;
  }
}