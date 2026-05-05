/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_HASH: process.env.NEXT_PUBLIC_BUILD_HASH || "docker",
  },
  generateBuildId: async () => {
    // Use the injected build hash from Docker/GitHub Action
    return process.env.NEXT_PUBLIC_BUILD_HASH || "docker";
  },
};

module.exports = nextConfig;