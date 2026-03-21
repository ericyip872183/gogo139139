# ── 构建阶段 ──────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/hardware-bridge/package.json ./packages/hardware-bridge/

RUN pnpm install --frozen-lockfile

COPY packages/frontend ./packages/frontend
COPY packages/shared ./packages/shared
COPY packages/hardware-bridge ./packages/hardware-bridge

RUN cd packages/frontend && pnpm build

# ── 运行阶段 (Nginx) ──────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
