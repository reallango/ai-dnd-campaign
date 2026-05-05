import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Use shell command at webpack time to get git hash
    const { execSync } = require("child_process");
    const shortCommit = execSync("git rev-parse --short HEAD").toString().trim();
    config.plugins.push(
      new (require("webpack").DefinePlugin)({
        "process.env.NEXT_PUBLIC_BUILD_HASH": JSON.stringify(shortCommit)
      })
    );
    return config;
  }
};

export default nextConfig;
