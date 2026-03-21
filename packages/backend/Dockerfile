# ── 构建阶段 ──────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

RUN cd packages/backend && pnpm exec prisma generate
RUN cd packages/backend && pnpm build

# ── 运行阶段 ──────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/packages/backend
EXPOSE 3000
CMD ["node", "dist/main.js"]
