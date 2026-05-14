// Ollama HTTP Client

import type { 
  OllamaTagResponse, 
  OllamaGenerateRequest, 
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaHealthResponse,
  OllamaOptions
} from './types';

export class OllamaClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string, defaultTimeout = 120000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultTimeout = defaultTimeout;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<OllamaHealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return await response.json();
      }
      return { status: 'offline' };
    } catch {
      return { status: 'offline' };
    }
  }

  async getTags(): Promise<OllamaTagResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama tags error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          system: request.system,
          stream: false,
          keep_alive: request.keep_alive ?? '10m',
          options: request.options
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama generate error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
          keep_alive: request.keep_alive ?? '10m',
          options: request.options
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama chat error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async generateText(
    model: string,
    prompt: string,
    systemPrompt?: string,
    options?: OllamaOptions,
    maxTokens?: number,
    keepAlive?: string | number
  ): Promise<string> {
    const request: OllamaGenerateRequest = {
      model,
      prompt,
      system: systemPrompt,
      stream: false,
      keep_alive: keepAlive ?? '10m',
      options: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.9,
        top_k: options?.top_k ?? 40,
        repeat_penalty: options?.repeat_penalty ?? 1.1,
        num_ctx: options?.num_ctx ?? 4096,
        num_predict: maxTokens ?? options?.num_predict ?? 512,
        ...options
      }
    };

    const response = await this.generate(request);
    return response.response;
  }

  async chatText(
    model: string,
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options?: OllamaOptions,
    keepAlive?: string | number
  ): Promise<string> {
    const request: OllamaChatRequest = {
      model,
      messages,
      stream: false,
      keep_alive: keepAlive ?? '10m',
      options: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.9,
        top_k: options?.top_k ?? 40,
        repeat_penalty: options?.repeat_penalty ?? 1.1,
        num_ctx: options?.num_ctx ?? 4096,
        ...options
      }
    };

    const response = await this.chat(request);
    return response.message.content;
  }
}

// Helper to create a client from a base URL string
export function createOllamaClient(baseUrl: string): OllamaClient {
  return new OllamaClient(baseUrl);
}