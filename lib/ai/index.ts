// AI Module - Database-driven multi-agent AI configuration system

import { routeTask, testAgent, chat } from './router';
import { OllamaClient, createOllamaClient } from './ollama-client';
import { discoverModels, discoverAllModels, getAvailableModels, getAllAvailableModels } from './discovery';
import { checkInstanceHealth, checkAllInstancesHealth, startHealthChecks, stopHealthChecks, restartHealthChecks } from './health';
import { buildContext, formatGameContext } from './context';
import { orchestrate } from './orchestrator';
import type { OllamaInstance, AvailableModel, AgentRole, RoleAssignment, RoleParameters, SystemPrompt, AppSetting, ResolvedAgent, GameContext, AIConfig, AIRequest, AIResponse } from './types';
import db from '@/lib/db';

// Legacy compatibility: Re-export callAI and checkAIAvailability
// These maintain backwards compatibility with the old lib/ai.ts API

export async function callAI(request: AIRequest): Promise<AIResponse> {
  // Default to DM role for backwards compatibility
  const result = await routeTask('dm', request.prompt, undefined, {
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 500,
    num_ctx: request.contextWindow ?? 4096,
  }, request.maxTokens);
  
  return {
    content: result.content,
    model: result.model,
  };
}

export async function checkAIAvailability(): Promise<{ available: boolean; provider: string; model?: string; error?: string }> {
  try {
    const database = db as any;
    
    // Get all active Ollama instances from database
    const instances = database.prepare(`
      SELECT id, name, base_url FROM ollama_instances WHERE is_active = 1
    `).all() as { id: number; name: string; base_url: string }[];
    
    if (instances.length === 0) {
      return { available: false, provider: 'ollama', error: 'No Ollama instances configured' };
    }
    
    // Check health of each instance
    for (const instance of instances) {
      try {
        const response = await fetch(`${instance.base_url}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const models = data.models || [];
          return {
            available: true,
            provider: 'ollama',
            model: models[0]?.name || 'llama3'
          };
        }
      } catch (e) {
        // Continue to next instance
        continue;
      }
    }
    
    return { available: false, provider: 'ollama', error: 'All instances are offline' };
  } catch (error) {
    return { 
      available: false, 
      provider: 'ollama', 
      error: error instanceof Error ? error.message : 'Failed to check availability' 
    };
  }
}

// Re-export router functions
export { resolveAgent, routeTask, testAgent, chat } from './router';

// Re-export Ollama client
export { OllamaClient, createOllamaClient } from './ollama-client';

// Re-export discovery
export { discoverModels, discoverAllModels, getAvailableModels, getAllAvailableModels } from './discovery';

// Re-export health
export { 
  checkInstanceHealth, 
  checkAllInstancesHealth, 
  startHealthChecks, 
  stopHealthChecks, 
  restartHealthChecks,
  getInstancesWithHealth,
  getHealthCheckInterval 
} from './health';

// Re-export context
export { buildContext, formatGameContext } from './context';

// Re-export orchestrator
export { orchestrate } from './orchestrator';

// Types
export * from './types';