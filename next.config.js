/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    const fs = require("fs");
    const { execSync } = require("child_process");
    let shortCommit = "docker";

    // First try .env.build (updated by GitHub Action)
    try {
      if (fs.existsSync(".env.build")) {
        const lines = fs.readFileSync(".env.build", "utf8").trim().split("\n");
        for (const line of lines) {
          if (line.startsWith("GIT_COMMIT=")) {
            shortCommit = line.substring(11).trim();
            break;
          }
        }
      }
    } catch (e) {
      console.log("Error reading .env.build:", e.message);
    }

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