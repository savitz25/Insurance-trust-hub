import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      { source: '/hubs/florida/south-florida', destination: '/hubs/south-florida', permanent: true },
      { source: '/hubs/florida/miami-dade-county', destination: '/hubs/florida/miami-dade', permanent: true },
      { source: '/hubs/florida/broward', destination: '/hubs/florida/broward-county', permanent: true },
      { source: '/hubs/florida/palm-beach', destination: '/hubs/florida/palm-beach-county', permanent: true },
      { source: '/resources/how-to-choose-an-insurance-agent', destination: '/resources/how-to-choose-insurance-agent', permanent: true },
      { source: '/resources/independent-vs-captive-agents', destination: '/resources/independent-vs-captive', permanent: true },
      { source: '/resources/hurricane-prep-insurance-florida', destination: '/resources/hurricane-prep-insurance', permanent: true },
    ];
  },
};

export default nextConfig;
