import { NextRequest, NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/ai';

// POST /api/admin/models - fetch available models from AI provider
export async function POST(request: NextRequest) {
  try {
    const config = await getAIConfig();
    const body = await request.json();
    const { ai_provider, ai_base_url, ai_api_key } = body;
    
    let models: string[] = [];
    
    if (ai_provider === 'ollama') {
      try {
        const res = await fetch(`${ai_base_url}/api/tags`, {
          method: 'GET',
        });
        const data = await res.json();
        models = (data.models || []).map((m: any) => m.name);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to connect to Ollama' }, { status: 400 });
      }
    } else if (ai_provider === 'openai') {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${ai_api_key}`,
          },
        });
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch OpenAI models' }, { status: 400 });
      }
    } else if (ai_provider === 'anthropic') {
      models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2.1', 'claude-2', 'claude-instant'];
    } else if (ai_provider === 'deepseek') {
      models = ['deepseek-chat', 'deepseek-coder'];
    }
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}