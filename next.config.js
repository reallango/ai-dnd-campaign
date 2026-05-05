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
