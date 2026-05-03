import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Internal test - call Ollama directly
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;
    
    // Get config from database
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    
    const baseUrl = settings.ai_base_url || 'http://localhost:11434';
    const model = settings.ai_model || 'llama3';
    const contextWindow = parseInt(settings.ai_context_window) || 4096;
    const keepLoaded = parseInt(settings.ai_keep_loaded) || 300;
    
    console.log('Direct call config:', { baseUrl, model, contextWindow, keepLoaded });
    console.log('Prompt:', prompt);
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 100,
          num_ctx: contextWindow,
          keep_alive: keepLoaded
        }
      })
    });
    
    const responseText = await response.text();
    console.log('Direct Ollama response:', response.status, responseText);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Ollama error ${response.status}`, 
        details: responseText 
      }, { status: 500 });
    }
    
    const data = JSON.parse(responseText);
    return NextResponse.json({ 
      content: data.message?.content || '',
      model: data.model
    });
  } catch (error) {
    console.error('Direct call error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed' 
    }, { status: 500 });
  }
}