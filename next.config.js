/** @type {import('next').NextConfig} */
import { execSync } from "child_process";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_HASH: commitHash,
  },
};

export default nextConfig;
