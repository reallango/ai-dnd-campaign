# 1. OBJECTIVE

Fix the commit hash by:
1. Removing the broken COPY .git from Dockerfile  
2. Fetching commit from GitHub using git ls-remote in next.config.js

# 2. CONTEXT SUMMARY

- **Issue 1**: Dockerfile has `COPY .git ./.git` that fails because `.git` doesn't exist in GitHub build context
- **Issue 2**: Need to fetch commit hash from GitHub instead of local git

# 3. APPROACH OVERVIEW

Remove the broken COPY line and use git ls-remote to fetch the commit.

# 4. IMPLEMENTATION STEPS

**Step 1: Fix Dockerfile - remove the COPY .git line**

Remove this from Dockerfile:
```dockerfile
# Explicitly copy .git directory
COPY .git ./.git
```

The Dockerfile should be:
```dockerfile
FROM node:22

# Install git for commit hash detection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Step 2: Update next.config.js to use git ls-remote**

```js
/** @type {import('next').NextConfig} */
import { execSync } from "child_process";
import { writeFileSync } from "fs";

let commitHash = process.env.GIT_COMMIT;

if (!commitHash) {
  try {
    // Try local git first
    commitHash = execSync("git rev-parse HEAD").toString().trim().substring(0, 7);
  } catch (e) {
    try {
      // Fallback: get current commit from origin using ls-remote
      const output = execSync("git ls-remote https://github.com/reallango/ai-dnd-campaign.git HEAD").toString();
      const match = output.match(/^([a-fA-F0-9]+)/);
      if (match) {
        commitHash = match[1].substring(0, 7);
      } else {
        commitHash = "unknown";
      }
    } catch (e2) {
      commitHash = "unknown";
    }
  }
}

// Write to build-info.json
writeFileSync(
  "./build-info.json",
  JSON.stringify({ buildHash: commitHash })
);

console.log("Build hash:", commitHash);

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_HASH: commitHash,
  },
};

export default nextConfig;
```

# 5. TESTING AND VALIDATION

- Build Docker image
- Verify build log shows commit hash from GitHub (should show 860c143 from the log)
- Curl `http://localhost:3000/api/version` - should show `860c143`
