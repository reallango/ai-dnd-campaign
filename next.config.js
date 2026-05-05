/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    const fs = require("fs");
    const { execSync } = require("child_process");
    
    // Try to get from environment first
    let shortCommit = process.env.GIT_COMMIT;

    // Fallback to git rev-parse (available if .git is copied to Docker)
    if (!shortCommit || shortCommit === "unknown") {
      try {
        shortCommit = execSync("git rev-parse --short HEAD").toString().trim();
      } catch (e) {
        shortCommit = "unknown";
      }
    }

    // Write to file
    fs.writeFileSync(
      "./build-info.json",
      JSON.stringify({ buildHash: shortCommit })
    );

    console.log("Build hash:", shortCommit);

    config.plugins.push(
      new (require("webpack").DefinePlugin)({
        "process.env.NEXT_PUBLIC_BUILD_HASH": JSON.stringify(shortCommit)
      })
    );
    return config;
  }
};

module.exports = nextConfig;