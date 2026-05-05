/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    // Use the injected build hash from Docker/GitHub Action
    return process.env.NEXT_PUBLIC_BUILD_HASH || "docker";
  },
};

module.exports = nextConfig;