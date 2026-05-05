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
