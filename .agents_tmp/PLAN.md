# 1. OBJECTIVE

Fix the commit hash by copying `.git` directory explicitly in the Dockerfile.

# 2. CONTEXT SUMMARY

- **Issue**: Docker's negation pattern `!.git` in .dockerignore doesn't work
- **Solution**: Use a separate COPY command in Dockerfile for .git

# 3. APPROACH OVERVIEW

Copy `.git` explicitly in the Dockerfile after the main project copy.

# 4. IMPLEMENTATION STEPS

**Update Dockerfile**

After the main COPY, add another COPY for .git:
```dockerfile
FROM node:22

# Install git for commit hash detection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full project (excluding .git by default)
COPY . .

# Explicitly copy .git directory
COPY .git ./.git

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Also remove negation from .dockerignore (clean up)**

The `!.git` line isn't needed in .dockerignore.

# 5. TESTING AND VALIDATION

- Build Docker image
- Verify build log shows commit hash
- Curl `http://localhost:3000/api/version` - should show actual commit hash
