/** @type {import('next').NextConfig} */
import { execSync } from "child_process";

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

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_HASH: commitHash,
  },
};

export default nextConfig;
