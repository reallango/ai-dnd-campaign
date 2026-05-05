// Portainer API URL detection
// Attempts to find a running Portainer instance

import https from 'https';

const FALLBACK_URLS = [
  // HTTP options
  'http://portainer:9000',
  'http://host.docker.internal:9000',
  // HTTPS options (with self-signed cert support)
  'https://host.docker.internal:9443',
  'https://portainer:9443',
];

let cachedUrl: string | null = null;
let triedUrls: string[] = [];

/**
 * Fetch with TLS handling to accept self-signed certificates
 */
async function fetchWithTLS(url: string, apiKey: string): Promise<{ok: boolean; status: number; data?: unknown}> {
  const urlObj = new URL(url);
  const isHTTPS = urlObj.protocol === 'https:';
  
  if (!isHTTPS) {
    // Regular HTTP fetch
    const response = await fetch(`${url}/api/system/status`, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey },
    });
    return { ok: response.ok, status: response.status };
  }
  
  // HTTPS with self-signed cert handling
  return new Promise((resolve) => {
    const req = https.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: '/api/system/status',
      method: 'GET',
      rejectUnauthorized: false, // Accept self-signed certs
      headers: { 'X-Api-Key': apiKey },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ 
          ok: res.statusCode === 200, 
          status: res.statusCode || 0,
          data: body ? JSON.parse(body) : {}
        });
      });
    });
    req.on('error', () => resolve({ ok: false, status: 0 }));
    req.end();
  });
}

/**
 * Detect Portainer API URL using fallback chain:
 * 1. Explicit env var (if set and non-empty)
 * 2. HTTPS on host.docker.internal:9443 (user confirmed works)
 * 3. HTTPS on portainer:9443
 * 4. HTTP on portainer:9000
 * 5. HTTP on host.docker.internal:9000
 */
export async function detectPortainerApiUrl(): Promise<string> {
  triedUrls = [];
  
  // Return cached if already detected
  if (cachedUrl) {
    return cachedUrl;
  }

  const apiKey = process.env.PORTAINER_API_TOKEN || '';

  // Check explicit env var first
  const envUrl = process.env.PORTAINER_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const url = envUrl.trim();
    triedUrls.push(url);
    try {
      const result = await fetchWithTLS(url, apiKey);
      if (result.ok) {
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
    triedUrls.push(baseUrl);
    try {
      const result = await fetchWithTLS(baseUrl, apiKey);

      if (result.ok) {
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
    'Portainer not found. Set PORTAINER_API_URL or ensure Portainer is reachable.'
  );
}

/**
 * Get the list of URLs that were tried (for error messages)
 */
export function getTriedUrls(): string[] {
  return [...triedUrls];
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