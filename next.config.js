/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    const fs = require("fs");
    const { execSync } = require("child_process");
    let shortCommit = process.env.GIT_COMMIT || "docker";

    // Fallback to git rev-parse
    if (shortCommit === "docker" || shortCommit.length < 3) {
      try {
        shortCommit = execSync("git rev-parse --short HEAD").toString().trim();
      } catch (e) {
        // git not available
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