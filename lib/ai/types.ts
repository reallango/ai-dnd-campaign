// Shared TypeScript interfaces for AI module

export interface OllamaInstance {
  id: number;
  name: string;
  base_url: string;
  description: string | null;
  is_active: number;
  last_health_check: string | null;
  health_status: 'online' | 'offline' | 'unknown';
  created_at: string;
  updated_at: string;
}

export interface AvailableModel {
  id: number;
  instance_id: number;
  model_tag: string;
  display_name: string | null;
  parameter_size: string | null;
  quantization: string | null;
  vram_required_mb: number | null;
  is_available: number;
  last_seen: string | null;
  created_at: string;
  // Joined fields
  instance_name?: string;
  instance_base_url?: string;
}

export interface AgentRole {
  id: number;
  role_key: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  // Joined with current assignment
  assignment?: RoleAssignment;
  parameters?: RoleParameters;
  activePrompt?: SystemPrompt;
}

export interface RoleAssignment {
  id: number;
  role_id: number;
  model_id: number;
  priority: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  model_tag?: string;
  model_display_name?: string;
  instance_id?: number;
  instance_name?: string;
  instance_base_url?: string;
}

export interface RoleParameters {
  id: number;
  role_id: number;
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  num_ctx: number;
  response_format: 'text' | 'json';
  keep_alive: string;
  max_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export interface SystemPrompt {
  id: number;
  role_id: number;
  prompt_text: string;
  version: number;
  is_active: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

// For resolving agent configuration
export interface ResolvedAgent {
  role: AgentRole;
  instance: OllamaInstance;
  model: AvailableModel;
  parameters: RoleParameters;
  systemPrompt: SystemPrompt;
}

// For building game context
export interface GameContext {
  campaignId: number;
  campaignName: string;
  sessionId: number;
  mode: string;
  characters: CharacterInfo[];
  recentNarrative: NarrativeEntry[];
  sessionNotes: string;
}

export interface CharacterInfo {
  id: number;
  name: string;
  race: string | null;
  class: string | null;
  level: number;
  hp: number | null;
  ac: number | null;
  stats: Record<string, number> | null;
}

export interface NarrativeEntry {
  id: number;
  type: string;
  content: string;
  created_at: string;
}

// AI request/response types
export interface AIRouterRequest {
  roleKey: string;
  userPrompt: string;
  gameContext?: GameContext;
  maxTokens?: number;
}

export interface AIRouterResponse {
  content: string;
  model: string;
  instance: string;
}

// Ollama API types
export interface OllamaTagResponse {
  models: OllamaModelInfo[];
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  keep_alive?: string | number;
  options: OllamaOptions;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  repeat_penalty?: number;
  num_ctx?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  keep_alive?: string | number;
  options?: OllamaOptions;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaHealthResponse {
  status: string;
}

// Legacy types for backwards compatibility with old lib/ai.ts API
export interface AIConfig {
  provider: 'ollama' | 'openai' | 'anthropic' | 'deepseek';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  contextWindow?: number;
  keepLoaded?: number;
  adultContent?: boolean;
  timeout?: number;
}

export interface AIRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  contextWindow?: number;
  keepLoaded?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}