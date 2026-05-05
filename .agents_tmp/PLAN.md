# 1. OBJECTIVE

Fix the commit hash by ensuring `.git` directory is copied to the Docker container.

# 2. CONTEXT SUMMARY

- **Current issue**: Docker excludes `.git` by default from the build context
- **Solution**: Explicitly tell Docker to include `.git` in .dockerignore

# 3. APPROACH OVERVIEW

Add `!.git` to .dockerignore to explicitly include the .git directory (overriding Docker's default exclusion).

# 4. IMPLEMENTATION STEPS

**Update .dockerignore**

Add at the end:
```
# Explicitly include .git for commit hash detection during build
!.git
```

This overrides Docker's default behavior of excluding `.git`.

**Verify next.config.js**

The current code using `git rev-parse HEAD` should work once .git is copied.

# 5. TESTING AND VALIDATION

- Build Docker image
- Verify build log shows commit hash (not "unknown")
- Curl `http://localhost:3000/api/version` - should show actual commit hash
