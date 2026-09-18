import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker/NAS 배포용: node_modules 전체가 아니라 실제 사용하는 파일만 추려
  // .next/standalone 에 담아준다. 이미지 용량과 시작 시간이 크게 줄어든다.
  output: 'standalone',
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // tsconfig 의 paths 와 동일한 별칭을 번들러에도 명시한다.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, '@': path.join(root, 'src') };
    return config;
  },
  turbopack: { resolveAlias: { '@/*': './src/*' } },
};

export default nextConfig;
