import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    // Return models from our new database-driven system
    const database = db as any;
    const models = database.prepare(`
      SELECT am.*, oi.name as instance_name, oi.base_url as instance_base_url
      FROM available_models am
      JOIN ollama_instances oi ON am.instance_id = oi.id
      ORDER BY oi.name, am.model_tag
    `).all();

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

// DELETE /api/admin/models - unload a specific model (Ollama)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, ai_base_url } = body;
    
    if (!model) {
      return NextResponse.json({ error: 'Model name required' }, { status: 400 });
    }
    
    // Get base URL from body or use default
    const baseUrl = ai_base_url || process.env.AI_BASE_URL || 'http://localhost:11434';
    
    try {
      // Use /api/generate with keep_alive: 0 at TOP LEVEL (not in options!)
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: '',  // empty prompt to unload
          keep_alive: 0  // TOP LEVEL - this is the key!
        }),
      });
      
      const data = await res.json();
      console.log('Unload response:', data);
      
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to unload model' }, { status: 400 });
      }
      
      return NextResponse.json({ success: true, done_reason: data.done_reason });
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