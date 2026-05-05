# 1. OBJECTIVE

Fix portainer API authentication header from "Authorization: Bearer" to "X-Api-Key".

# 2. CONTEXT SUMMARY

Working test:
```bash
curl -k https://host.docker.internal:9443/api/stacks \
  -H "X-Api-Key: ptr_EqnRFh..."
```

Code uses:
```ts
'Authorization': `Bearer ${token}`
```

These two formats work differently:
- `Authorization: Bearer` - requires JWT token (doesn't work)
- `X-Api-Key` - requires API access token (DOES work)

# 3. APPROACH OVERVIEW

Change the auth header in `/src/server/portainerClient.ts` from `Authorization: Bearer` to `X-Api-Key`.

# 4. IMPLEMENTATION STEPS

**In `/src/server/portainerClient.ts`:**

Update `getAuthHeaders()`:

```ts
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
```

Also update discovery if it uses Bearer.

# 5. TESTING AND VALIDATION

- Test: curl http://localhost:3000/api/portainer/stack
- Should return: {ok: true, id: 39, name: "gm"}
