// Health Check - periodic health checks for Ollama instances

import db from '@/lib/db';
import { OllamaClient } from './ollama-client';
import type { OllamaInstance } from './types';

let healthCheckInterval: NodeJS.Timeout | null = null;

export async function checkInstanceHealth(instanceId: number): Promise<{ status: 'online' | 'offline' | 'unknown'; error?: string }> {
  const database = db as any;
  
  const instance = database.prepare('SELECT * FROM ollama_instances WHERE id = ?').get(instanceId) as OllamaInstance | undefined;
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  const client = new OllamaClient(instance.base_url);
  const currentTime = new Date().toISOString();

  try {
    const health = await client.healthCheck();
    
    const status = health ? 'online' : 'offline';
    
    database.prepare(`
      UPDATE ollama_instances 
      SET health_status = ?, last_health_check = ?, updated_at = ?
      WHERE id = ?
    `).run(status, currentTime, currentTime, instanceId);

    return { status };
  } catch (error) {
    const status: 'online' | 'offline' | 'unknown' = 'offline';
    
    database.prepare(`
      UPDATE ollama_instances 
      SET health_status = ?, last_health_check = ?, updated_at = ?
      WHERE id = ?
    `).run(status, currentTime, currentTime, instanceId);

    return { 
      status, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Check health of all active instances
export async function checkAllInstancesHealth(): Promise<{ instanceId: number; status: string; error?: string }[]> {
  const database = db as any;
  
  const instances = database.prepare(`
    SELECT id FROM ollama_instances WHERE is_active = 1
  `).all() as { id: number }[];

  const results: { instanceId: number; status: string; error?: string }[] = [];

  for (const instance of instances) {
    const result = await checkInstanceHealth(instance.id);
    results.push({
      instanceId: instance.id,
      status: result.status,
      error: result.error
    });
  }

  return results;
}

// Get health check interval from settings
export function getHealthCheckInterval(): number {
  const database = db as any;
  
  const setting = database.prepare(`
    SELECT value FROM app_settings WHERE key = 'health_check_interval_sec'
  `).get() as { value: string } | undefined;

  return setting ? parseInt(setting.value, 10) : 60; // Default 60 seconds
}

// Start periodic health checks
export function startHealthChecks(): void {
  if (healthCheckInterval) {
    return; // Already running
  }

  const interval = getHealthCheckInterval() * 1000;
  
  const runHealthCheck = async () => {
    try {
      await checkAllInstancesHealth();
    } catch (e) {
      console.error('Health check error:', e);
    }
  };

  // Run immediately, then on interval
  runHealthCheck();
  healthCheckInterval = setInterval(runHealthCheck, interval);
  
  console.log(`Health checks started with interval ${interval}ms`);
}

// Stop periodic health checks
export function stopHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('Health checks stopped');
  }
}

// Restart with new interval
export function restartHealthChecks(): void {
  stopHealthChecks();
  startHealthChecks();
}

// Get instances with their health status
export function getInstancesWithHealth(): (OllamaInstance & { modelCount: number })[] {
  const database = db as any;
  return database.prepare(`
    SELECT oi.*, 
      (SELECT COUNT(*) FROM available_models WHERE instance_id = oi.id AND is_available = 1) as model_count
    FROM ollama_instances oi
    ORDER BY oi.name
  `).all() as (OllamaInstance & { modelCount: number })[];
}