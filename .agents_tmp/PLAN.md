# 1. OBJECTIVE

Fix portainer detection by consolidating the duplicate discovery modules into one and ensuring consistent TLS handling.

# 2. CONTEXT SUMMARY

Found TWO discovery modules that might have conflicting caches:
1. `src/server/portainerDiscovery.ts` (used by /status) - Bearer auth
2. `lib/portainerDiscovery.ts` (used by /detect) - X-Api-Key auth

Both have the correct URLs (https://host.docker.internal:9443) and rejectUnauthorized: false.

But they have separate caches and different auth headers.

The curl test proves it WORKS from inside the container with NO token - so maybe the detection should work even without requiring a token for /api/system/status.

# 3. APPROACH OVERVIEW

1. Remove the token requirement for the status check (since it works without auth)2. Delete the duplicate `lib/portainerDiscovery.ts` 
3. Consolidate all imports to use `src/server/portainerDiscovery.ts`

# 4. IMPLEMENTATION STEPS

**Step 1: Make status check work without token requirement**

In `src/server/portainerDiscovery.ts`, make the status check not require a token (since curl worked without one):

```ts
// For status check only - don't require token
const token = process.env.PORTAINER_API_TOKEN;
// Still try with token if available, but don't fail if missing
```

**Step 2: Delete duplicate `lib/portainerDiscovery.ts`**

Remove or rename the duplicate:
```bash
rm lib/portainerDiscovery.ts
```

**Step 3: Update API routes to all use the same module**

Update `/app/api/portainer/detect/route.ts` to import from `@/src/server/portainerDiscovery`.

**Step 4: Clear any cached URLs** (in existing routes, call clearCachedUrl())

# 5. TESTING AND VALIDATION

- Test: `curl http://localhost:3000/api/portainer/status`
- Should return: `{ok: true, reachable: true, apiUrl: "https://host.docker.internal:9443"}`
