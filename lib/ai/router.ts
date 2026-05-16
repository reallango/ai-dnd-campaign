// AI Router - resolves and routes tasks to the appropriate agent

import db from '@/lib/db';
import { OllamaClient } from './ollama-client';
import { discoverModels } from './discovery';
import { formatGameContext } from './context';
import type { 
  ResolvedAgent, 
  AgentRole, 
  OllamaInstance, 
  AvailableModel, 
  RoleParameters, 
  SystemPrompt,
  OllamaOptions
} from './types';

// Get app setting
function getSetting(key: string, defaultValue = ''): string {
  const database = db as any;
  const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? defaultValue;
}

// Resolve agent configuration for a role
export function resolveAgent(roleKey: string): ResolvedAgent | null {
  const database = db as any;

  // Get the role
  const role = database.prepare(`
    SELECT * FROM agent_roles WHERE role_key = ? AND is_active = 1
  `).get(roleKey) as AgentRole | undefined;

  if (!role) {
    console.log(`Role ${roleKey} not found or inactive`);
    return null;
  }

  // Get active assignment with highest priority (lowest number)
  const assignment = database.prepare(`
    SELECT ra.*, am.model_tag, am.display_name as model_display_name, 
           am.instance_id, oi.name as instance_name, oi.base_url as instance_base_url
    FROM role_assignments ra
    JOIN available_models am ON ra.model_id = am.id
    JOIN ollama_instances oi ON am.instance_id = oi.id
    WHERE ra.role_id = ? AND ra.is_active = 1 
      AND am.is_available = 1 
      AND oi.health_status = 'online'
    ORDER BY ra.priority ASC
    LIMIT 1
  `).get(role.id) as (any & { 
    model_tag: string; 
    model_display_name: string;
    instance_id: number;
    instance_name: string;
    instance_base_url: string;
  }) | undefined;

  if (!assignment) {
    console.log(`No active assignment for role ${roleKey}`);
    return null;
  }

  // Get the instance
  const instance = database.prepare(`
    SELECT * FROM ollama_instances WHERE id = ?
  `).get(assignment.instance_id) as OllamaInstance | undefined;

  if (!instance) {
    console.log(`Instance ${assignment.instance_id} not found`);
    return null;
  }

  // Get the model
  const model = database.prepare(`
    SELECT * FROM available_models WHERE id = ?
  `).get(assignment.model_id) as AvailableModel | undefined;

  if (!model) {
    console.log(`Model ${assignment.model_id} not found`);
    return null;
  }

  // Get parameters
  const parameters = database.prepare(`
    SELECT * FROM role_parameters WHERE role_id = ?
  `).get(role.id) as RoleParameters | undefined;

  if (!parameters) {
    console.log(`No parameters for role ${roleKey}, using defaults`);
  }

  // Get active system prompt
  const systemPrompt = database.prepare(`
    SELECT * FROM system_prompts WHERE role_id = ? AND is_active = 1
  `).get(role.id) as SystemPrompt | undefined;

  if (!systemPrompt) {
    console.log(`No active system prompt for role ${roleKey}`);
  }

  return {
    role,
    instance,
    model,
    parameters: parameters || {
      id: 0,
      role_id: role.id,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1,
      num_ctx: 4096,
      response_format: 'text',
      keep_alive: '10m',
      max_tokens: null,
      created_at: '',
      updated_at: ''
    },
    systemPrompt: systemPrompt || {
      id: 0,
      role_id: role.id,
      prompt_text: '',
      version: 1,
      is_active: 1,
      notes: null,
      created_by: null,
      created_at: ''
    }
  };
}

// Route a task to the appropriate agent
export async function routeTask(
  roleKey: string,
  userPrompt: string,
  gameContext?: { campaignId: number; sessionId?: number; gameSystemId?: number },
  overrideParams?: Partial<RoleParameters>,
  maxTokens?: number
): Promise<{ content: string; model: string; instance: string }> {
  // Resolve the agent
  let agent = resolveAgent(roleKey);

  // If not found and fallback enabled, try DM
  if (!agent) {
    const fallbackEnabled = getSetting('fallback_enabled', 'true') === 'true';
    if (fallbackEnabled && roleKey !== 'dm') {
      console.log(`Falling back to DM role`);
      agent = resolveAgent('dm');
    }

    if (!agent) {
      throw new Error(`No available agent for role: ${roleKey}`);
    }
  }

  // Build context string if provided
  let contextString = '';
  if (gameContext?.campaignId) {
    const { buildContext, formatGameContext } = await import('./context');
    const context = buildContext(gameContext.campaignId, gameContext.sessionId);
    if (context) {
      contextString = formatGameContext(context);
    }
  }

  // Build system prompt
  let systemPrompt = agent.systemPrompt.prompt_text;
  if (contextString) {
    systemPrompt = `${systemPrompt}\n\n# Current Game State\n${contextString}`;
  }

  // Merge parameters
  const params = { ...agent.parameters, ...overrideParams };

  // Build Ollama options
  const ollamaOptions: OllamaOptions = {
    temperature: params.temperature,
    top_p: params.top_p,
    top_k: params.top_k,
    repeat_penalty: params.repeat_penalty,
    num_ctx: params.num_ctx
  };

  // Make the API call
  const client = new OllamaClient(agent.instance.base_url);

  try {
    const response = await client.generateText(
      agent.model.model_tag,
      userPrompt,
      systemPrompt,
      ollamaOptions,
      maxTokens ?? params.max_tokens ?? undefined,
      params.keep_alive
    );

    return {
      content: response,
      model: agent.model.model_tag,
      instance: agent.instance.name
    };
  } catch (error) {
    // If failed and we have a fallback, try that
    const fallbackEnabled = getSetting('fallback_enabled', 'true') === 'true';
    if (fallbackEnabled && roleKey !== agent.role.role_key) {
      console.log(`Primary agent failed, trying fallback`);
      // Get the fallback assignment
      const database = db as any;
      const fallback = database.prepare(`
        SELECT ra.model_id
        FROM role_assignments ra
        WHERE ra.role_id = ? AND ra.is_active = 1 AND ra.priority > 1
        ORDER BY ra.priority ASC
        LIMIT 1
      `).get(agent.role.id) as { model_id: number } | undefined;

      if (fallback) {
        // The resolveAgent would have returned the fallback if primary was unavailable
        // Since we're here, the primary was available but the call failed
        // This is a rare edge case - just throw the error
      }
    }

    throw error;
  }
}

// Test an agent with a custom prompt
export async function testAgent(
  roleKey: string,
  testPrompt: string
): Promise<{ content: string; model: string; instance: string; error?: string }> {
  try {
    const result = await routeTask(roleKey, testPrompt);
    return { ...result };
  } catch (error) {
    return {
      content: '',
      model: '',
      instance: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Simple chat without game context - for quick testing
export async function chat(
  roleKey: string,
  message: string
): Promise<{ content: string; model: string; instance: string }> {
  return routeTask(roleKey, message);
}