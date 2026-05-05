# 1. OBJECTIVE

Fix the commit hash to correctly return the commit SHA (not "docker") by using a more explicit git command.

# 2. CONTEXT SUMMARY

- **Current issue**: `git rev-parse --short HEAD` returns "docker" which is incorrect
- **Root cause**: Either the .git is incomplete, or there's a ref named "docker" causing confusion
- **Fix**: Use `git rev-parse HEAD` (full SHA) then shorten it ourselves

# 3. APPROACH OVERVIEW

Use the full commit SHA and shorten it manually to ensure we get the actual commit, not a ref name.

# 4. IMPLEMENTATION STEPS

**Update next.config.js**

Replace the git command to get the full SHA first, then shorten:
```js
/** @type {import('next').NextConfig} */
import { execSync } from "child_process";
import { writeFileSync } from "fs";

let commitHash = process.env.GIT_COMMIT;

if (!commitHash) {
  try {
    // Get full SHA first, then take first 7 chars
    const fullHash = execSync("git rev-parse HEAD").toString().trim();
    commitHash = fullHash.substring(0, 7);
    console.log("Git full hash:", fullHash);
  } catch (e) {
    commitHash = "unknown";
  }
}

// Write to build-info.json for the API endpoint
writeFileSync(
  "./build-info.json",
  JSON.stringify({ buildHash: commitHash })
);

console.log("Build hash (short):", commitHash);

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_HASH: commitHash,
  },
};

export default nextConfig;
```

# 5. TESTING AND VALIDATION

- Build Docker image
- Curl `http://localhost:3000/api/version` - should show the actual commit hash (7 chars)
- Expected format: `{"version":"0.0.1","build":"c5c017b","buildHash":"c5c017b"}`
