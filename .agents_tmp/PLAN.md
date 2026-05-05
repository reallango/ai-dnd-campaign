# 1. OBJECTIVE

Fix branch field extraction in portainer client - should read from GitConfig.ReferenceName, not RepositoryReferenceName.

# 2. CONTEXT SUMMARY

The stack is found but branch is showing empty because:
- Stack field: `GitConfig.ReferenceName` = "refs/heads/main"
- Code uses: `stack.RepositoryReferenceName` = undefined

# 3. APPROACH OVERVIEW

Update the code to read branch from `GitConfig.ReferenceName`.

# 4. IMPLEMENTATION STEPS

**In `/src/server/portainerClient.ts`:**

Find where branch is extracted and update:

```ts
// Current (wrong):
branch: stack.RepositoryReferenceName || '',

// Should be:
branch: stack.GitConfig?.ReferenceName || '',
```

Also need to strip the "refs/heads/" prefix to just show "main".

# 5. TESTING AND VALIDATION

- Test branch shows as "main" not "refs/heads/main"
- Update button becomes active
