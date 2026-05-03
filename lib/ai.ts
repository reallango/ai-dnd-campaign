// AI Service - supports local (Ollama) and cloud (OpenAI-compatible) AI providers

import db from '@/lib/db';

export interface AIConfig {
  provider: 'ollama' | 'openai' | 'anthropic' | 'deepseek';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Get AI configuration from database or environment
function getConfig(): AIConfig {
  // First try database settings
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    
    if (settings.ai_provider) {
      return {
        provider: settings.ai_provider as AIConfig['provider'],
        apiKey: settings.ai_api_key || undefined,
        baseUrl: settings.ai_base_url || 'http://localhost:11434',
        model: settings.ai_model || getDefaultModel(settings.ai_provider),
      };
    }
  } catch (e) {
    // Database not available, fall back to env
  }
  
  // Fall back to environment variables
  const provider = process.env.AI_PROVIDER || 'ollama';
  
  return {
    provider: provider as AIConfig['provider'],
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434',
    model: process.env.AI_MODEL || getDefaultModel(provider),
  };
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'ollama':
      return 'llama3';
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'deepseek':
      return 'deepseek-chat';
    default:
      return 'llama3';
  }
}

// Call AI with the configured provider
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const config = getConfig();
  
  switch (config.provider) {
    case 'ollama':
      return callOllama(request, config);
    case 'openai':
      return callOpenAI(request, config);
    case 'anthropic':
      return callAnthropic(request, config);
    case 'deepseek':
      return callDeepSeek(request, config);
    default:
      return callOllama(request, config);
  }
}

async function callOllama(request: AIRequest, config: AIConfig): Promise<AIResponse> {
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(request.system ? [{ role: 'system', content: request.system }] : []),
        { role: 'user', content: request.prompt }
      ],
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? 500,
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.message?.content || '',
    model: config.model || 'llama3'
  };
}

async function callOpenAI(request: AIRequest, config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key required');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [
        ...(request.system ? [{ role: 'system', content: request.system }] : []),
        { role: 'user', content: request.prompt }
      ],
      max_tokens: request.maxTokens ?? 500,
      temperature: request.temperature ?? 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || config.model || 'gpt-4o-mini',
    usage: data.usage
  };
}

async function callAnthropic(request: AIRequest, config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error('Anthropic API key required');
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      messages: [
        { role: 'user', content: request.prompt }
      ],
      max_tokens: request.maxTokens ?? 500,
      temperature: request.temperature ?? 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    model: data.model || config.model || 'claude-3-haiku-20240307',
    usage: data.usage
  };
}

async function callDeepSeek(request: AIRequest, config: AIConfig): Promise<AIResponse> {
  if (!config.apiKey) {
    throw new Error('DeepSeek API key required');
  }
  
  const baseUrl = config.baseUrl || 'https://api.deepseek.com';
  
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [
        ...(request.system ? [{ role: 'system', content: request.system }] : []),
        { role: 'user', content: request.prompt }
      ],
      max_tokens: request.maxTokens ?? 500,
      temperature: request.temperature ?? 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DeepSeek error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || config.model || 'deepseek-chat',
    usage: data.usage
  };
}

// Check if AI is available
export async function checkAIAvailability(): Promise<{ available: boolean; provider: string; model?: string; error?: string }> {
  const config = getConfig();
  
  if (config.provider === 'ollama') {
    try {
      const response = await fetch(`${config.baseUrl}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          provider: 'ollama',
          model: config.model
        };
      }
      return { available: false, provider: 'ollama', error: 'Connection failed' };
    } catch (error) {
      return { 
        available: false, 
        provider: 'ollama', 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }
  
  // For cloud providers, check if API key is set
  if (config.apiKey) {
    // Try a minimal request to verify
    try {
      await callAI({ 
        prompt: 'Hello', 
        maxTokens: 5 
      });
      return {
        available: true,
        provider: config.provider,
        model: config.model
      };
    } catch (error) {
      return {
        available: false,
        provider: config.provider,
        error: error instanceof Error ? error.message : 'API error'
      };
    }
  }
  
  return {
    available: false,
    provider: config.provider,
    error: 'API key not configured'
  };
}