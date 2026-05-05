// Portainer API URL Discovery Module
// Discovers Portainer API URL at runtime using Bearer token auth

import https from 'https';

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

interface PortainerStatus {
  Version: string;
}

interface PortainerUrlSuccess {
  ok: true;
  url: string;
}

interface PortainerUrlError {
  ok: false;
  error: string;
  tried: string[];
  missingEnv: string[];
}

export type PortainerUrlResult = PortainerUrlSuccess | PortainerUrlError;

const CANDIDATE_URLS = [
  // HTTPS-first (modern Portainer default - port 9443)
  'https://portainer:9443',
  'https://host.docker.internal:9443',
  // Legacy HTTP fallback (port 9000)
  'http://portainer:9000',
  'http://host.docker.internal:9000',
];

let cachedBaseUrl: string | null = null;

/**
 * Build candidate URL list in exact order:
 * 1. PORTAINER_API_URL env var (if set and non-empty)
 * 2. https://portainer:9443/api
 * 3. https://host.docker.internal:9443/api
 * 4. http://portainer:9000/api
 * 5. http://host.docker.internal:9000/api
 */
function buildCandidates(): string[] {
  const envUrl = process.env.PORTAINER_API_URL;
  const candidates: string[] = [];
  
  if (envUrl && envUrl.trim() !== '') {
    candidates.push(envUrl.trim());
  }
  
  // Add fallback candidates (no localhost)
  candidates.push(...CANDIDATE_URLS);
  
  return candidates;
}

/**
 * Detect Portainer API URL by probing candidates
 * Returns structured result instead of throwing
 */
export async function detectPortainerApiUrlWithStatus(): Promise<PortainerUrlResult> {
  // Return cached if already detected
  if (cachedBaseUrl) {
    return { ok: true, url: cachedBaseUrl };
  }
  
  const token = process.env.PORTAINER_API_TOKEN;
  
  const candidates = buildCandidates();
  const tried: string[] = [];
  
  // First try without token (works for /api/system/status)
  for (const candidate of candidates) {
    tried.push(candidate);
    try {
      const response = await fetch(`${candidate}/api/system/status`, {
        method: 'GET',
        // No auth needed for status endpoint
      } as any);
      
      if (response.ok) {
        const data = await response.json() as PortainerStatus;
        if (data && data.Version) {
          cachedBaseUrl = candidate;
          console.log(`[Portainer] Detected at: ${candidate}`);
          return { ok: true, url: candidate };
        }
      }
    } catch {
      console.log(`[Portainer] Not reachable: ${candidate}`);
    }
  }
  
  // If no token, fail without trying auth
  if (!token) {
    return {
      ok: false,
      error: 'Portainer not reachable',
      tried,
      missingEnv: [],
    };
  }
  
  // Second try with token (for other API calls that need auth)
  const triedWithAuth: string[] = [];
  for (const candidate of candidates) {
    triedWithAuth.push(candidate);
    try {
      const response = await fetch(`${candidate}/api/system/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        agent: candidate.startsWith('https://') ? insecureAgent : undefined,
      } as any);
      
      if (response.ok) {
        const data = await response.json() as PortainerStatus;
        if (data && data.Version) {
          cachedBaseUrl = candidate;
          console.log(`[Portainer] Detected at: ${candidate} (with auth)`);
          return { ok: true, url: candidate };
        }
      }
    } catch {
      console.log(`[Portainer] Not reachable with auth: ${candidate}`);
    }
  }
  
  // All candidates failed
  return {
    ok: false,
    error: 'Unable to detect Portainer API URL',
    tried: candidates,
    missingEnv: token ? [] : ['PORTAINER_API_TOKEN'],
  };
}

/**
 * Detect Portainer API URL by probing candidates
 * Uses Bearer token auth - throws if no candidates work
 * @deprecated Use detectPortainerApiUrlWithStatus() instead for structured errors
 */
export async function detectPortainerApiUrl(): Promise<string> {
  // Return cached if already detected
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }
  
  const token = process.env.PORTAINER_API_TOKEN;
  if (!token) {
    throw new Error('PORTAINER_API_TOKEN not set');
  }
  
  const candidates = buildCandidates();
  
  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/api/system/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json() as PortainerStatus;
        if (data && data.Version) {
          cachedBaseUrl = candidate;
          console.log(`[Portainer] Detected at: ${candidate}`);
          return candidate;
        }
      }
    } catch {
      console.log(`[Portainer] Not reachable: ${candidate}`);
    }
  }
  
  throw new Error('Unable to detect Portainer API URL');
}

/**
 * Get cached/base URL (returns null if not detected yet)
 */
export function getPortainerUrl(): string | null {
  return cachedBaseUrl;
}

/**
 * Check if Portainer is available (synchronous, uses cache)
 */
export function isPortainerAvailable(): boolean {
  return cachedBaseUrl !== null;
}

/**
 * Clear cached URL (for testing)
 */
export function clearCachedUrl(): void {
  cachedBaseUrl = null;
}