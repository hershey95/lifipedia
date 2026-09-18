import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // tsconfig 의 paths 와 동일한 별칭을 번들러에도 명시한다.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, '@': path.join(root, 'src') };
    return config;
  },
  turbopack: { resolveAlias: { '@/*': './src/*' } },
};

export default nextConfig;
