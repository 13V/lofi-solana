/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lofi/sdk"],
  // Allow Tone.js (uses Web Audio API) to work with SSR off for audio components
  experimental: {
    // React 19 concurrent features
    reactCompiler: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Tone.js requires Web Audio — exclude from server bundle
      config.externals = [...(config.externals ?? []), "tone"];
    }
    return config;
  },
};

export default nextConfig;
