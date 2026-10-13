import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker/NAS 배포용: node_modules 전체가 아니라 실제 사용하는 파일만 추려
  // .next/standalone 에 담아준다. 이미지 용량과 시작 시간이 크게 줄어든다.
  output: 'standalone',
  // 이미지는 <Image unoptimized> 로 원본 URL 을 그대로 쓴다. 최적화 서버(/_next/image)는 끄고,
  // 서버가 임의의 외부 주소를 대신 가져오는 열린 프록시(SSRF)가 되지 않게 한다.
  images: { unoptimized: true },
  async headers() {
    const prod = process.env.NODE_ENV === 'production';
    // Next 가 인라인 스크립트를 쓰므로 script-src 에 'unsafe-inline' 이 필요하다(nonce 도입은 후속 과제).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(prod
            ? [
                { key: 'Content-Security-Policy', value: csp },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
              ]
            : []),
        ],
      },
    ];
  },
  // tsconfig 의 paths 와 동일한 별칭을 번들러에도 명시한다.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, '@': path.join(root, 'src') };
    return config;
  },
  turbopack: { resolveAlias: { '@/*': './src/*' } },
};

export default nextConfig;
