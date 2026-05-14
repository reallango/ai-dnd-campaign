// AI Module - Database-driven multi-agent AI configuration system

// Types
export * from './types';

// Router
export { resolveAgent, routeTask, testAgent, chat } from './router';

// Ollama Client
export { OllamaClient, createOllamaClient } from './ollama-client';

// Discovery
export { discoverModels, discoverAllModels, getAvailableModels, getAllAvailableModels } from './discovery';

// Health
export { 
  checkInstanceHealth, 
  checkAllInstancesHealth, 
  startHealthChecks, 
  stopHealthChecks, 
  restartHealthChecks,
  getInstancesWithHealth,
  getHealthCheckInterval 
} from './health';

// Context
export { buildContext, formatGameContext } from './context';