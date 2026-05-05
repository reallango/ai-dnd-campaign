# 1. OBJECTIVE

Fix the commit hash - build generates 13e4ea5 but API returns "docker". Need to ensure consistency between what gets written and what gets read.

# 2. CONTEXT SUMMARY

- **Build log shows**: `Build hash: 13e4ea5` - getting written correctly
- **API returns**: `docker` - old/stale value or wrong file being read
- **Root cause**: Likely a cached image or the old prebuild script value

# 3. APPROACH OVERVIEW

1. Fix prebuild script to also use the correct hash
2. Update API to check both possible file locations  
3. Clear any caches

# 4. IMPLEMENTATION STEPS

**Step 1: Fix prebuild script in package.json**

Change from:
```json
"prebuild": "echo \"export const BUILD_HASH: string = 'localdev'\" > src/buildInfo.ts",
```

To:
```json
"prebuild": "echo \"export const BUILD_HASH: string = '$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')\" > src/buildInfo.ts",
```

**Step 2: Also write to src/buildInfo.ts in next.config.js**

Add to next.config.js, after writing build-info.json:
```js
writeFileSync(
  "./src/buildInfo.ts", 
  `export const BUILD_HASH: string = '${commitHash}'`
);
```

**Step 3: Update version API to check multiple locations**

```ts
export async function GET() {
  let buildHash = "unknown";
  
  // Check build-info.json (written by next.config.js)
  const buildInfoPath = join(process.cwd(), "build-info.json");
  if (existsSync(buildInfoPath)) {
    try {
      const buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf8"));
      buildHash = buildInfo.buildHash || "unknown";
    } catch (e) {
      // ignore
    }
  }
  
  // Fallback: check src/buildInfo.ts
  if (buildHash === "unknown") {
    const tsPath = join(process.cwd(), "src", "buildInfo.ts");
    if (existsSync(tsPath)) {
      try {
        const content = readFileSync(tsPath, "utf8");
        const match = content.match(/BUILD_HASH.*?=.*?['"]([^'"]+)['"]/);
        if (match) {
          buildHash = match[1];
        }
      } catch (e) {
        // ignore
      }
    }
  }
  
  return NextResponse.json({
    version: '0.0.1',
    build: buildHash,
    buildHash: buildHash
  });
}
```

# 5. TESTING AND VALIDATION

- Rebuild Docker image fresh (no cache)
- Verify build log shows hash being written
- Curl API returns correct hash
