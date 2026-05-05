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
