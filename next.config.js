/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Use shell command at webpack time to get git hash
    const { execSync } = require("child_process");
    let shortCommit = "docker";
    try {
      shortCommit = execSync("git rev-parse --short HEAD").toString().trim();
    } catch (e) {
      // git not available, use default
    }
    config.plugins.push(
      new (require("webpack").DefinePlugin)({
        "process.env.NEXT_PUBLIC_BUILD_HASH": JSON.stringify(shortCommit)
      })
    );
    return config;
  }
};

module.exports = nextConfig;