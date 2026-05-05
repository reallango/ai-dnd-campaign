# 1. OBJECTIVE

Two tasks:
1. Fix branch field extraction in code (GitConfig.ReferenceName)
2. Update UI to show branch names and dropdown

# 2. CODE FIX: Branch Extraction

Stack field: `GitConfig.ReferenceName` = "refs/heads/main"

Update code to:
```ts
// Read from correct field, strip prefix
const branch = (stack.GitConfig?.ReferenceName || '').replace('refs/heads/', '');
```

# 3. UI: Branch Names and Dropdown

Display mapping:
- "refs/heads/stable" → "Stable"
- "refs/heads/dev" → "Dev"
- etc.

**In admin page Portainer tab:**

- Show current branch as "Stable" or "Dev" (not the full git ref)
- Update dropdown with options:
  - "Stable" (refs/heads/stable)
  - "Dev" (refs/heads/dev)
- Pre-select the current branch in the dropdown
- Update button updates to the selected branch

# 4. IMPLEMENTATION STEPS

**Code in portainerClient.ts:**

```ts
// Extract and normalize branch name
const rawBranch = stack.GitConfig?.ReferenceName || '';
const branch = rawBranch.replace('refs/heads/', ''); // "main" → "main", etc.

// For display:
// If branch is "main" or "stable" → "Stable"
// If branch is "dev" → "Dev"
const displayName = branch === 'dev' ? 'Dev' : 
                  branch === 'stable' || branch === 'main' ? 'Stable' :
                  branch;
```

**UI in admin page:**

- Dropdown with options: Stable, Dev
- Value maps: Stable → "refs/heads/stable", Dev → "refs/heads/dev"
- On update, send the full ref to the API

# 5. TESTING AND VALIDATION

- Branch shows as "Stable" or "Dev" not "refs/heads/main"
- Dropdown shows current branch selected
- Update deploys the selected branch
