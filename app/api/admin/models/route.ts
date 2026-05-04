import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/models - check currently loaded models (Ollama)
export async function GET() {
  try {
    // Get base URL from environment
    const ai_base_url = process.env.AI_BASE_URL || 'http://localhost:11434';
    
    try {
      const res = await fetch(`${ai_base_url}/api/ps`, {
        method: 'GET',
      });
      const data = await res.json();
      
      const loadedModels = (data.models || []).map((m: any) => m.name).filter(Boolean);
      return NextResponse.json({ loaded_models: loadedModels });
    } catch (e) {
      return NextResponse.json({ error: 'Failed to connect to Ollama' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error checking loaded models:', error);
    return NextResponse.json({ error: 'Failed to check loaded models' }, { status: 500 });
  }
}

// DELETE /api/admin/models - unload a specific model (Ollama)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { model } = body;
    
    if (!model) {
      return NextResponse.json({ error: 'Model name required' }, { status: 400 });
    }
    
    // Get base URL from environment
    const ai_base_url = process.env.AI_BASE_URL || 'http://localhost:11434';
    
    try {
      // Use /api/generate with keep_alive: 0 to unload the model
      const res = await fetch(`${ai_base_url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: '',
          options: { keep_alive: 0 }
        }),
      });
      
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to unload model' }, { status: 400 });
      }
      
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'Failed to connect to Ollama' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error unloading model:', error);
    return NextResponse.json({ error: 'Failed to unload model' }, { status: 500 });
  }
}

// POST /api/admin/models - fetch available models from AI provider
export async function POST(request: NextRequest) {
  try {
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