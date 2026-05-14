// Model Discovery - discover models from Ollama instances

import db from '@/lib/db';
import { OllamaClient } from './ollama-client';
import type { OllamaInstance, AvailableModel, OllamaModelInfo } from './types';

export async function discoverModels(instanceId: number): Promise<{ discovered: number; errors: string[] }> {
  const database = db as any;
  const errors: string[] = [];
  
  // Get the instance
  const instance = database.prepare('SELECT * FROM ollama_instances WHERE id = ?').get(instanceId) as OllamaInstance | undefined;
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  const client = new OllamaClient(instance.base_url);

  try {
    // Fetch models from Ollama
    const tagResponse = await client.getTags();
    const ollamaModels = tagResponse.models || [];

    // Parse model info (format: "modelname:tag" or just "modelname")
    const parseModelName = (fullName: string): { model: string; tag: string } => {
      const colonIndex = fullName.lastIndexOf(':');
      if (colonIndex > 0) {
        return {
          model: fullName.substring(0, colonIndex),
          tag: fullName.substring(colonIndex + 1)
        };
      }
      return { model: fullName, tag: 'latest' };
    };

    // Get existing models for this instance
    const existingModels = database.prepare(`
      SELECT id, model_tag, is_available FROM available_models WHERE instance_id = ?
    `).all(instanceId) as { id: number; model_tag: string; is_available: number }[];
    
    const existingTags = new Set(existingModels.map(m => m.model_tag));
    const currentTime = new Date().toISOString();

    // Upsert discovered models
    const upsertStmt = database.prepare(`
      INSERT INTO available_models (instance_id, model_tag, display_name, parameter_size, quantization, is_available, last_seen)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(instance_id, model_tag) DO UPDATE SET
        display_name = COALESCE(excluded.display_name, available_models.display_name),
        parameter_size = COALESCE(excluded.parameter_size, available_models.parameter_size),
        is_available = 1,
        last_seen = excluded.last_seen
    `);

    let discoveredCount = 0;

    for (const ollamaModel of ollamaModels) {
      const { model, tag } = parseModelName(ollamaModel.name);
      
      // Try to extract parameter size and quantization from tag
      let paramSize: string | null = null;
      let quantization: string | null = null;
      
      // Common patterns: "14b", "8b", "3b", "70b", etc.
      const sizeMatch = tag.match(/(\d+[bf])/i);
      if (sizeMatch) {
        paramSize = sizeMatch[1].toUpperCase();
      }
      
      // Common quantization patterns: "Q4_K_M", "Q5_K_S", "Q8_0", etc.
      const quantMatch = tag.match(/(Q\d+[A-Z_]*)/i);
      if (quantMatch) {
        quantization = quantMatch[1].toUpperCase();
      }

      try {
        upsertStmt.run(
          instanceId,
          ollamaModel.name,
          model,  // display_name
          paramSize,
          quantization,
          1,
          currentTime
        );
        discoveredCount++;
      } catch (e) {
        console.error(`Failed to upsert model ${ollamaModel.name}:`, e);
      }
    }

    // Mark models that weren't seen as unavailable
    const seenTags = new Set(ollamaModels.map(m => m.name));
    for (const existing of existingModels) {
      if (!seenTags.has(existing.model_tag)) {
        database.prepare(`
          UPDATE available_models SET is_available = 0 WHERE id = ?
        `).run(existing.id);
      }
    }

    // Update instance health status
    database.prepare(`
      UPDATE ollama_instances 
      SET health_status = 'online', last_health_check = ?, updated_at = ?
      WHERE id = ?
    `).run(currentTime, currentTime, instanceId);

    return { discovered: discoveredCount, errors };
  } catch (error) {
    // Mark instance as offline
    const currentTime = new Date().toISOString();
    database.prepare(`
      UPDATE ollama_instances 
      SET health_status = 'offline', last_health_check = ?, updated_at = ?
      WHERE id = ?
    `).run(currentTime, currentTime, instanceId);
    
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return { discovered: 0, errors };
  }
}

// Discover models for all active instances
export async function discoverAllModels(): Promise<{ instanceId: number; discovered: number; errors: string[] }[]> {
  const database = db as any;
  
  const instances = database.prepare(`
    SELECT id FROM ollama_instances WHERE is_active = 1
  `).all() as { id: number }[];

  const results: { instanceId: number; discovered: number; errors: string[] }[] = [];

  for (const instance of instances) {
    try {
      const result = await discoverModels(instance.id);
      results.push({ instanceId: instance.id, ...result });
    } catch (e) {
      results.push({
        instanceId: instance.id,
        discovered: 0,
        errors: [e instanceof Error ? e.message : 'Unknown error']
      });
    }
  }

  return results;
}

// Get available models for an instance
export function getAvailableModels(instanceId: number): AvailableModel[] {
  const database = db as any;
  return database.prepare(`
    SELECT am.*, oi.name as instance_name, oi.base_url as instance_base_url
    FROM available_models am
    JOIN ollama_instances oi ON am.instance_id = oi.id
    WHERE am.instance_id = ? AND am.is_available = 1
    ORDER BY am.model_tag
  `).all(instanceId) as AvailableModel[];
}

// Get all available models across all instances
export function getAllAvailableModels(): (AvailableModel & { instance_name: string; instance_base_url: string })[] {
  const database = db as any;
  return database.prepare(`
    SELECT am.*, oi.name as instance_name, oi.base_url as instance_base_url
    FROM available_models am
    JOIN ollama_instances oi ON am.instance_id = oi.id
    WHERE am.is_available = 1
    ORDER BY oi.name, am.model_tag
  `).all() as (AvailableModel & { instance_name: string; instance_base_url: string })[];
}