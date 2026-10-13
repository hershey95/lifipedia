# Lifipedia — NAS/셀프호스팅용 멀티스테이지 Dockerfile
# 시놀로지 Container Manager, QNAP Container Station, 일반 docker compose 어디서든 동작합니다.

FROM node:22-alpine AS base
# Prisma 엔진이 필요로 하는 OpenSSL. Alpine 은 기본 포함되어 있지 않다.
RUN apk add --no-cache libc6-compat openssl

# ---------------------------------------------------------------- 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- 빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 단계에서는 prisma generate 와 next build 만 하므로 임시 경로면 충분하다(실제 DB 는 런타임 볼륨).
ENV DATABASE_URL="file:/tmp/build.db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------- 런타임
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 출력 — next.config.mjs 의 output:'standalone' 설정으로
# 실제 런타임에 필요한 node_modules 만 추려져 들어있다.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# SQLite 데이터 디렉터리. compose 의 named volume 이 여기에 붙고, migrate 가 소유권을 1001 로 맞춘다.
RUN mkdir -p /data && chown nextjs:nodejs /data
USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
