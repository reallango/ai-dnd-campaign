# 1. OBJECTIVE

Replace the current webpack-based build hash injection in `next.config.js` with the simpler `env` block method to make the commit short hash available as `NEXT_PUBLIC_BUILD_HASH` in the client-side bundle.

# 2. CONTEXT SUMMARY

- **File**: `/workspace/project/ai-dnd-campaign/next.config.js`
- **Current implementation**: Uses webpack DefinePlugin to inject the build hash
- **Desired approach**: Use the Next.js `env` config block pattern
- **No external dependencies**: Just uses Node.js built-in modules (execSync)

# 3. APPROACH OVERVIEW

Simplify the build hash injection by using Next.js's built-in `env` configuration block instead of the webpack plugin approach. This method is more idiomatic for Next.js and requires less code.

The changes:
1. Add import for `execSync` from "child_process" at the top
2. Add the commit hash variable before the export
3. Replace the config object with the `env` block containing the hash

# 4. IMPLEMENTATION STEPS

1. **Add import statement**: Add `import { execSync } from "child_process";` at the very top of next.config.js (after the JSDoc comment)

2. **Add commit hash variable**: Before the config object, add:
   ```js
   const commitHash = execSync("git rev-parse --short HEAD")
     .toString()
     .trim();
   ```

3. **Replace the config object**: Replace the current webpack-based config with a simpler config that uses the `env` block:
   ```js
   const nextConfig = {
     env: {
       NEXT_PUBLIC_BUILD_HASH: commitHash,
     },
   };
   
   export default nextConfig;
   ```

4. **Update the build script**: If there's a build script that reads from build-info.json, update it to use the `env` variable instead (check package.json for build commands)

# 5. TESTING AND VALIDATION

- Run the build (`npm run build` or `next build`)
- Verify the build completes without errors
- Check that `NEXT_PUBLIC_BUILD_HASH` is available in the client bundle by searching for the hash string in the built output (in `.next/` directory)
- If the app displays the build hash (e.g., in a footer or debug info), verify it shows correctly
