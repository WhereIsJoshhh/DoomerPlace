import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // The API and frontend each have a lockfile; keep Next scoped to this app.
    root: process.cwd(),
  },
};

export default nextConfig;
