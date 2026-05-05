# 1. OBJECTIVE

Fix portainer stack detection to use https.request instead of fetch in the client code.

# 2. CONTEXT SUMMARY

The detection works now:
- Status: `curl /api/portainer/status` returns `{ok: true, reachable: true, apiUrl: "https://host.docker.internal:9443"}`
- But stack API returns `{error: "fetch failed"}`

Manual test proves `https.request` works but `fetch` doesn't in Node 22.

The files that need fixing:
- `/src/server/portainerDiscovery.ts` - already fixed
- `/src/server/portainerClient.ts` - still uses fetch, needs fixing

# 3. APPROACH OVERVIEW

Update `/src/server/portainerClient.ts` to use `https.request` instead of `fetch` for all Portainer API calls.

# 4. IMPLEMENTATION STEPS

**In `/src/server/portainerClient.ts`:**

Replace all `fetch` calls with `https.request` (for HTTPS) or `http.request` (for HTTP).

Example change:
```ts
// Old (doesn't work):
const response = await fetch(`${baseUrl}/api/stacks`, {
  headers: getAuthHeaders(),
  agent: baseUrl.startsWith('https://') ? insecureAgent : undefined,
} as any);

// New (works):
const client = baseUrl.startsWith('https://') ? https : http;
const result = await new Promise((resolve, reject) => {
  const urlObj = new URL(baseUrl);
  const req = client.request({
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: '/api/stacks',
    method: 'GET',
    rejectUnauthorized: false,
    headers: getAuthHeaders(),
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve(JSON.parse(body)));
  });
  req.on('error', reject);
  req.end();
});
```

Apply this fix to all fetch calls in the file.

# 5. TESTING AND VALIDATION

- Test: curl http://localhost:3000/api/portainer/stack
- Should return stack info with Id: 39, Name: "gm"
