import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/test-connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ai_provider, ai_base_url, ai_model, ai_api_key } = body;

    let url = ai_base_url;
    let headers: Record<string, string> = {};
    let model = ai_model;

    if (ai_provider === 'ollama') {
      url = `${ai_base_url}/api/tags`;
    } else if (ai_provider === 'openai') {
      url = `${ai_base_url}/v1/models`;
      headers = { 'Authorization': `Bearer ${ai_api_key}` };
    } else if (ai_provider === 'anthropic') {
      url = `${ai_base_url}/v1/models`;
      headers = { 'x-api-key': ai_api_key };
    } else if (ai_provider === 'deepseek') {
      url = `${ai_base_url}/v1/models`;
      headers = { 'Authorization': `Bearer ${ai_api_key}` };
      model = ai_model || 'deepseek-chat';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    }).catch((err) => {
      throw new Error(`Connection failed: ${err.message}`);
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} ${errorText}`);
    }

    if (ai_provider === 'ollama') {
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      return NextResponse.json({ success: true, models, model: ai_model });
    }

    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id) || [];
    
    return NextResponse.json({ success: true, models, model: ai_model });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 400 }
    );
  }
}