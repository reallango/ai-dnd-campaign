// Portainer API URL Discovery Module
// Discovers Portainer API URL at runtime using Bearer token auth

interface PortainerStatus {
  Version: string;
}

const CANDIDATE_URLS = [
  'http://portainer:9000',
  'http://host.docker.internal:9000',
];

let cachedBaseUrl: string | null = null;

/**
 * Build candidate URL list in exact order:
 * 1. PORTAINER_API_URL env var (if set and non-empty)
 * 2. http://portainer:9000
 * 3. http://host.docker.internal:9000
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
 * Uses Bearer token auth - throws if no candidates work
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
        // Verify we get valid JSON
        const data = await response.json() as PortainerStatus;
        if (data && data.Version) {
          cachedBaseUrl = candidate;
          console.log(`[Portainer] Detected at: ${candidate}`);
          return candidate;
        }
      }
    } catch {
      // Try next candidate
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