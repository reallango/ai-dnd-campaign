// Portainer API Client
// Provides typed wrappers for Portainer API operations

import { detectPortainerApiUrl, getPortainerUrl } from './portainerDiscovery';

// Types
export interface Stack {
  Id: number;
  Name: string;
  RepositoryURL?: string;
  RepositoryReferenceName?: string;
  AutoUpdate?: {
    Webhook?: string;
  };
  GitConfig?: {
    URL?: string;
  };
}

export interface Webhook {
  id: number;
  url: string;
}

// Structured error response
export interface StackError {
  ok: false;
  error: string;
  missingEnv: string[];
}

export interface StackFound {
  ok: true;
  id: number;
  name: string;
  repoUrl: string;
  branch: string;
  webhooks: string[];
}

export type StackResult = StackFound | StackError;

/**
 * Normalize URL for comparison:
 * - lowercase
 * - strip trailing ".git"
 * - strip trailing slashes
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

/**
 * Get the Portainer base URL (uses detection)
 */
export async function getPortainerBaseUrl(): Promise<string> {
  return detectPortainerApiUrl();
}

/**
 * Get auth headers for Portainer API
 */
function getAuthHeaders(): HeadersInit {
  const token = process.env.PORTAINER_API_TOKEN;
  if (!token) {
    throw new Error('PORTAINER_API_TOKEN not configured');
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Get all stacks from Portainer
 */
export async function getStacks(): Promise<Stack[]> {
  const baseUrl = await detectPortainerApiUrl();
  const response = await fetch(`${baseUrl}/api/stacks`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch stacks: ${response.statusText}`);
  }
  
  return response.json() as Promise<Stack[]>;
}

/**
 * Get stack by ID
 */
export async function getStackById(id: number): Promise<Stack | null> {
  const baseUrl = await detectPortainerApiUrl();
  const response = await fetch(`${baseUrl}/api/stacks/${id}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch stack: ${response.statusText}`);
  }
  
  return response.json() as Promise<Stack>;
}

/**
 * Find stack by name
 */
export async function getStackByName(name: string): Promise<Stack | null> {
  const stacks = await getStacks();
  return stacks.find(s => s.Name === name) || null;
}

/**
 * Get webhooks for a stack
 */
export async function getWebhooksForStack(stackId: number): Promise<Webhook[]> {
  const baseUrl = await detectPortainerApiUrl();
  const response = await fetch(`${baseUrl}/api/stacks/${stackId}/webhooks`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    // Some Portainer versions don't have this endpoint
    return [];
  }
  
  return response.json() as Promise<Webhook[]>;
}

/**
 * Trigger stack update via webhook URL
 */
export async function triggerWebhookUpdate(webhookUrl: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }
}

/**
 * Trigger stack update by updating git reference
 * This uses Portainer's API to update the stack's repository reference
 */
export async function triggerStackUpdate(stackId: number, branch: string): Promise<void> {
  const baseUrl = await detectPortainerApiUrl();
  
  // First, try to update the stack's git reference
  const updateResponse = await fetch(`${baseUrl}/api/stacks/${stackId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RepositoryReferenceName: branch,
    }),
  });
  
  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update stack: ${error}`);
  }
  
  // Then trigger a redeploy
  const redeployResponse = await fetch(`${baseUrl}/api/stacks/${stackId}/upstack`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!redeployResponse.ok) {
    console.warn('Stack updated but redeploy may have failed');
  }
}

/**
 * Find stack using ID, Name, or Git-based auto-detection
 * Returns structured result with ok:false if not found
 */
export async function findTargetStack(): Promise<StackResult> {
  const stackId = process.env.PORTAINER_STACK_ID;
  const stackName = process.env.PORTAINER_STACK_NAME;
  
  // 1. If PORTAINER_STACK_ID is set → return that stack
  if (stackId) {
    const id = parseInt(stackId, 10);
    if (!isNaN(id)) {
      const stack = await getStackById(id);
      if (stack) {
        const webhooks = stack.AutoUpdate?.Webhook ? [stack.AutoUpdate.Webhook] : [];
        return {
          ok: true,
          id: stack.Id,
          name: stack.Name,
          repoUrl: stack.RepositoryURL || '',
          branch: stack.RepositoryReferenceName || '',
          webhooks,
        };
      }
    }
  }
  
  // 2. Else if PORTAINER_STACK_NAME is set → return that stack
  if (stackName) {
    const stack = await getStackByName(stackName);
    if (stack) {
      const webhooks = stack.AutoUpdate?.Webhook ? [stack.AutoUpdate.Webhook] : [];
      return {
        ok: true,
        id: stack.Id,
        name: stack.Name,
        repoUrl: stack.RepositoryURL || '',
        branch: stack.RepositoryReferenceName || '',
        webhooks,
      };
    }
  }
  
  // 3. Else → attempt Git-based auto-detection
  const owner = process.env.GITHUB_OWNER || 'reallango';
  const repo = process.env.GITHUB_REPO || 'ai-dnd-campaign';
  const targetUrl = normalizeUrl(`https://github.com/${owner}/${repo}.git`);
  
  const stacks = await getStacks();
  
  // Find stacks matching the repo URL
  const matchingStacks = stacks.filter(s => {
    const stackUrl = s.GitConfig?.URL || s.RepositoryURL || '';
    return normalizeUrl(stackUrl) === targetUrl;
  });
  
  // 4. If exactly one match → return it
  if (matchingStacks.length === 1) {
    const stack = matchingStacks[0];
    const webhooks = stack.AutoUpdate?.Webhook ? [stack.AutoUpdate.Webhook] : [];
    return {
      ok: true,
      id: stack.Id,
      name: stack.Name,
      repoUrl: stack.RepositoryURL || '',
      branch: stack.RepositoryReferenceName || '',
      webhooks,
    };
  }
  
  // 5. If zero matches → return error with missingEnv
  if (matchingStacks.length === 0) {
    return {
      ok: false,
      error: 'Stack not found',
      missingEnv: ['PORTAINER_STACK_ID', 'PORTAINER_STACK_NAME'],
    };
  }
  
  // 6. If multiple matches → return error with missingEnv
  return {
    ok: false,
    error: 'Multiple stacks match this repo',
    missingEnv: ['PORTAINER_STACK_ID', 'PORTAINER_STACK_NAME'],
  };
}