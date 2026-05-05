/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    const { execSync, existsSync } = require("child_process");
    let shortCommit = "docker";
    
    // First try .env.build (updated by GitHub Action)
    try {
      if (existsSync(".env.build")) {
        const content = require("fs").readFileSync(".env.build", "utf8");
        const match = content.match(/GIT_COMMIT=(.+)/);
        if (match) {
          shortCommit = match[1].trim();
        }
      }
    } catch (e) {}
    
    // Fallback to git rev-parse
    if (shortCommit === "docker") {
      try {
        shortCommit = execSync("git rev-parse --short HEAD").toString().trim();
      } catch (e) {
        // git not available, use default
      }
    }
    
    // Write to file for server-side access
    require("fs").writeFileSync(
      "./build-info.json",
      JSON.stringify({ buildHash: shortCommit })
    );
    
    // Also inject for client-side
    config.plugins.push(
      new (require("webpack").DefinePlugin)({
        "process.env.NEXT_PUBLIC_BUILD_HASH": JSON.stringify(shortCommit)
      })
    );
    return config;
  }
};

module.exports = nextConfig;