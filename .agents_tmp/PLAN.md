# 1. OBJECTIVE

Fix the commit hash by fetching it from the GitHub remote during the Docker build, since `.git` isn't available in the build context.

# 2. CONTEXT SUMMARY

- **Issue**: Docker builds from GitHub repo, not local filesystem - no `.git` directory available
- **Solution**: Fetch the current commit hash using `git ls-remote` or GitHub API during build

# 3. APPROACH OVERVIEW

Two options:

**Option A** (simpler): Use `git ls-remote` to get the current commit from the origin remote
- Requires git to be installed (already there)
- Fetches from GitHub to get current HEAD commit

**Option B**: Use GitHub API with a token
- More reliable but requires token

# 4. IMPLEMENTATION STEPS

**Update next.config.js to fetch from remote**

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

The `git ls-remote` command connects to GitHub and gets the current HEAD commit SHA without needing `.git` locally.

# 5. TESTING AND VALIDATION

- Build Docker image
- Verify build log shows commit hash from GitHub
- Curl `http://localhost:3000/api/version` - should show actual commit hash
