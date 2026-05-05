// Portainer API URL detection
// Attempts to find a running Portainer instance

const FALLBACK_URLS = [
  'http://portainer:9000',
  'http://host.docker.internal:9000',
];

let cachedUrl: string | null = null;

/**
 * Detect Portainer API URL using fallback chain:
 * 1. Explicit env var (if set and non-empty)
 * 2. http://portainer:9000 (Docker service name)
 * 3. http://host.docker.internal:9000 (host gateway)
 */
export async function detectPortainerApiUrl(): Promise<string> {
  // Return cached if already detected
  if (cachedUrl) {
    return cachedUrl;
  }

  // Check explicit env var first
  const envUrl = process.env.PORTAINER_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const url = envUrl.trim();
    try {
      const response = await fetch(`${url}/api/system/status`, {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.PORTAINER_API_TOKEN || '',
        },
      });
      if (response.ok) {
        cachedUrl = url;
        console.log(`[Portainer] Using explicit URL: ${url}`);
        return url;
      }
    } catch {
      // Env var set but not reachable
      console.warn(`[Portainer] Explicit URL not reachable: ${url}`);
    }
  }

  // Try fallback URLs in order
  for (const baseUrl of FALLBACK_URLS) {
    try {
      const response = await fetch(`${baseUrl}/api/system/status`, {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.PORTAINER_API_TOKEN || '',
        },
      });

      if (response.ok) {
        cachedUrl = baseUrl;
        console.log(`[Portainer] Auto-detected URL: ${baseUrl}`);
        return baseUrl;
      }
    } catch {
      // This URL not reachable, try next
      console.log(`[Portainer] Not found at: ${baseUrl}`);
    }
  }

  throw new Error(
    'Portainer not found. Set PORTAINER_API_URL or ensure Portainer is reachable at portainer:9000 or host.docker.internal:9000'
  );
}

/**
 * Check if Portainer API is available (synchronous, uses cache)
 */
export function isPortainerAvailable(): boolean {
  return cachedUrl !== null;
}

/**
 * Get the currently detected/cached URL
 */
export function getPortainerUrl(): string | null {
  return cachedUrl;
}

/**
 * Clear the cached URL (useful for testing)
 */
export function clearCachedUrl(): void {
  cachedUrl = null;
}

/**
 * Reset detection (clears cache and re-detects)
 */
export async function resetDetection(): Promise<string> {
  cachedUrl = null;
  return detectPortainerApiUrl();
}