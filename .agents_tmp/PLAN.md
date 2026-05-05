# 1. OBJECTIVE

Replace the current webpack-based build hash injection in `next.config.js` with the simpler `env` block method, and ensure git is available in the Docker build environment.

# 2. CONTEXT SUMMARY

- **File**: `/workspace/project/ai-dnd-campaign/next.config.js`
- **Dockerfile**: Need to add git installation
- **Issue**: The git rev-parse command fails in Docker because git isn't installed in the container

# 3. APPROACH OVERVIEW

Two changes:
1. Install git in the Dockerfile so the git command works inside Docker
2. Use the `env` block method in next.config.js with error handling

# 4. IMPLEMENTATION STEPS

**Step 1: Update next.config.js**

1. **Add import statement**: Add `import { execSync } from "child_process";` at the very top (after JSDoc)

2. **Add commit hash variable with fallback**: Before the config object:
   ```js
   // Try to get from environment first (can be passed via Docker --build-arg)
   let commitHash = process.env.GIT_COMMIT;

   // Fallback to git rev-parse (works if git is installed)
   if (!commitHash) {
     try {
       commitHash = execSync("git rev-parse --short HEAD").toString().trim();
     } catch (e) {
       commitHash = "unknown";
     }
   }
   ```

3. **Replace the config object**:
   ```js
   const nextConfig = {
     env: {
       NEXT_PUBLIC_BUILD_HASH: commitHash,
     },
   };
   
   export default nextConfig;
   ```

**Step 2: Update Dockerfile**

Add git installation before the npm run build step. For Debian-based images (Node.js):
```dockerfile
# Install git for commit hash detection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
```

Add this right after the base image and before the npm install step.

# 5. TESTING AND VALIDATION

- Run Docker build and verify it completes without git errors
- Check that the commit hash is in the bundle (search in `.next/` for the hash)
- The value should be the actual git commit short hash (e.g., "abc123")
