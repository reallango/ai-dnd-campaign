// Portainer API Client
// Provides typed wrappers for Portainer API operations

import https from 'https';
import http from 'http';
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
    ReferenceName?: string; // e.g. "refs/heads/main"
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
 * HTTP request helper for Portainer API
 */
function portainerRequest<T>(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
} = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const isHTTPS = url.startsWith('https://');
    const urlObj = new URL(url);
    const client = isHTTPS ? https : http;
    
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHTTPS ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      rejectUnauthorized: false, // Accept self-signed certs
      headers: options.headers as Record<string, string>,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Normalize Git URL for comparison:
 * - Convert SSH URLs (git@github.com:) to HTTPS
 * - lowercase
 * - strip trailing ".git"
 * - strip trailing slashes
 */
function normalizeGitUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let u = url.trim().toLowerCase();

  // Convert SSH → HTTPS
  // git@github.com:reallango/ai-dnd-campaign.git
  if (u.startsWith('git@github.com:')) {
    u = u.replace('git@github.com:', 'https://github.com/');
  }

  // Strip trailing .git
  if (u.endsWith('.git')) {
    u = u.slice(0, -4);
  }

  // Strip trailing slashes
  while (u.endsWith('/')) {
    u = u.slice(0, -1);
  }

  return u;
}

/**
 * Strip git reference prefix:
 * "refs/heads/main" → "main"
 * "refs/heads/feature/x" → "feature/x"
 */
function stripRefsPrefix(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (ref.startsWith('refs/heads/')) {
    return ref.slice(11); // Remove "refs/heads/"
  }
  return ref;
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
function getAuthHeaders(): Record<string, string> {
  const token = process.env.PORTAINER_API_TOKEN;
  if (!token) {
    throw new Error('PORTAINER_API_TOKEN not configured');
  }
  // Use X-Api-Key header (for API access tokens), not Bearer
  return {
    'X-Api-Key': token,
  };
}

/**
 * Get all stacks from Portainer
 */
export async function getStacks(): Promise<Stack[]> {
  const baseUrl = await detectPortainerApiUrl();
  return portainerRequest<Stack[]>(`${baseUrl}/api/stacks`, {
    headers: getAuthHeaders(),
  });
}

/**
 * Get stack by ID
 */
export async function getStackById(id: number): Promise<Stack | null> {
  const baseUrl = await detectPortainerApiUrl();
  try {
    return await portainerRequest<Stack>(`${baseUrl}/api/stacks/${id}`, {
      headers: getAuthHeaders(),
    });
  } catch {
    return null;
  }
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
  try {
    return await portainerRequest<Webhook[]>(`${baseUrl}/api/stacks/${stackId}/webhooks`, {
      headers: getAuthHeaders(),
    });
  } catch {
    // Some Portainer versions don't have this endpoint
    return [];
  }
}

/**
 * Trigger stack update via webhook URL
 */
export async function triggerWebhookUpdate(webhookUrl: string): Promise<void> {
  await portainerRequest<any>(webhookUrl, { method: 'POST' });
}

/**
 * Trigger stack update by updating git reference
 * This uses Portainer's API to update the stack's repository reference
 */
export async function triggerStackUpdate(stackId: number, branch: string): Promise<void> {
  const baseUrl = await detectPortainerApiUrl();
  
  // First, try to update the stack's git reference
  try {
    await portainerRequest<any>(`${baseUrl}/api/stacks/${stackId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        RepositoryReferenceName: branch,
      }),
    });
  } catch (e) {
    throw new Error(`Failed to update stack: ${e}`);
  }
  
  // Then trigger a redeploy
  try {
    await portainerRequest<any>(`${baseUrl}/api/stacks/${stackId}/upstack`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
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
          branch: stripRefsPrefix(stack.GitConfig?.ReferenceName) || stack.RepositoryReferenceName || '',
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
        branch: stripRefsPrefix(stack.GitConfig?.ReferenceName) || stack.RepositoryReferenceName || '',
        webhooks,
      };
    }
  }
  
  // 3. Else → attempt Git-based auto-detection
  const owner = process.env.GITHUB_OWNER || 'reallango';
  const repo = process.env.GITHUB_REPO || 'ai-dnd-campaign';
  const targetRepo = normalizeGitUrl(`https://github.com/${owner}/${repo}`);
  
  const stacks = await getStacks();
  
  // Find stacks matching the repo URL (using normalized comparison)
  const gitMatches = stacks.filter(s => {
    const stackRepo = normalizeGitUrl(s.GitConfig?.URL);
    return stackRepo && targetRepo && stackRepo === targetRepo;
  });
  
  // 4. If exactly one match → return it
  if (gitMatches.length === 1) {
    const stack = gitMatches[0];
    const webhooks = stack.AutoUpdate?.Webhook ? [stack.AutoUpdate.Webhook] : [];
    return {
      ok: true,
      id: stack.Id,
      name: stack.Name,
      repoUrl: stack.RepositoryURL || '',
      branch: stripRefsPrefix(stack.GitConfig?.ReferenceName) || stack.RepositoryReferenceName || '',
      webhooks,
    };
  }
  
  // 5. If zero matches → return error with missingEnv
  if (gitMatches.length === 0) {
    return {
      ok: false,
      error: 'No Git-based stack matched the repository URL',
      missingEnv: ['PORTAINER_STACK_ID', 'PORTAINER_STACK_NAME'],
    };
  }
  
  // 6. If multiple matches → return error with missingEnv
  return {
    ok: false,
    error: 'Multiple Git-based stacks match this repository',
    missingEnv: ['PORTAINER_STACK_ID', 'PORTAINER_STACK_NAME'],
  };
}