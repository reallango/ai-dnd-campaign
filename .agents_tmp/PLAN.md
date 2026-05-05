# 1. OBJECTIVE

Fix the commit hash to match the current commit (c5c017b) by copying the `.git` directory to Docker so git can calculate the hash inside the container.

# 2. CONTEXT SUMMARY

- **Issue**: Docker copies source files but not `.git`, so git can't determine the current commit
- **Solution**: Copy `.git` directory to the container (or at least the needed parts)
- **Files**: .dockerignore, Dockerfile

# 3. APPROACH OVERVIEW

Include the `.git` directory in the Docker build so git rev-parse works inside the container:
1. Update .dockerignore to NOT exclude .git
2. Keep git installation in Dockerfile
3. Keep the next.config.js env block approach

# 4. IMPLEMENTATION STEPS

**Step 1: Update .dockerignore**

Remove `.git` from the exclusions (or add a line allowing it):
```
# Keep .git for git rev-parse during build
!.git
```

Or simply remove `.git` from the ignore list entirely.

**Step 2: Verify/Update Dockerfile**

Ensure git is still installed:
```dockerfile
FROM node:22

# Install git for commit hash detection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full project including .git
COPY . .

# ... rest of Dockerfile
```

**Step 3: next.config.js stays as the env block approach**

```js
/** @type {import('next').NextConfig} */
import { execSync } from "child_process";
import { writeFileSync } from "fs";

let commitHash = process.env.GIT_COMMIT;

if (!commitHash) {
  try {
    commitHash = execSync("git rev-parse --short HEAD").toString().trim();
  } catch (e) {
    commitHash = "unknown";
  }
}

// Write to build-info.json for the API endpoint
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

- Build Docker image (no extra args needed)
- Curl `http://localhost:3000/api/version` and verify `buildHash` matches `c5c017b`
- Expected: `{"version":"0.0.1","build":"c5c017b","buildHash":"c5c017b"}`
