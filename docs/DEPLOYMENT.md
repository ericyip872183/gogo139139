# 盼蕾平台 — 部署架构

> **本文件描述生产服务器环境、Docker 容器配置、环境变量说明、首次部署流程及日常运维操作。部署或运维时查阅。**

---

## 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | 120.77.144.5 |
| 操作系统 | Linux（阿里云 ECS） |
| SSH 密钥 | `C:\Users\23791\.ssh\id_rsa` |
| 代码路径 | `/root/panlei` |
| 访问地址 | http://120.77.144.5 |

---

## 容器架构

```
┌─────────────────────────────────────────────────┐
│  Docker Network: panlei_default                  │
│                                                  │
│  panlei-frontend (nginx:alpine)                  │
│    端口: 0.0.0.0:80→80                           │
│    反向代理 /api/* → backend:3000                │
│                                                  │
│  panlei-backend (node:20-alpine)                 │
│    端口: 3000（内部，不对外暴露）                 │
│    依赖: mysql (healthy) + redis                 │
│                                                  │
│  panlei-mysql (mysql:8.0)                        │
│    端口: 3306（内部）                             │
│    数据卷: mysql_data                             │
│                                                  │
│  panlei-redis (redis:7-alpine)                   │
│    端口: 6379（内部）                             │
│    数据卷: redis_data                             │
└─────────────────────────────────────────────────┘
```

---

## 环境变量（`/root/panlei/.env`）

| 变量 | 说明 |
|------|------|
| MYSQL_ROOT_PASSWORD | MySQL root 密码 |
| MYSQL_DATABASE | 数据库名 `panlei_prod` |
| MYSQL_USER | 数据库用户 `panlei` |
| MYSQL_PASSWORD | 数据库密码 |
| REDIS_PASSWORD | Redis 密码 |
| REDIS_URL | `redis://:{password}@redis:6379` |
| JWT_SECRET | JWT 签名密钥（64位随机字符串） |
| NODE_ENV | `production` |
| PORT | `3000` |

---

## 首次部署流程

```bash
# 1. SSH 登录服务器
ssh -i C:/Users/23791/.ssh/id_rsa root@120.77.144.5

# 2. 上传代码
scp -r packages/backend packages/frontend deploy ... root@120.77.144.5:/root/panlei/

# 3. 创建 .env
cp .env.production.example .env  # 然后修改密码

# 4. 构建并启动
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 5. 初始化数据库
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"

# 6. 创建超管账号（首次）
docker exec panlei-backend node -e "
const { PrismaClient } = require('/app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.tenant.create({ data: { name: '盼蕾平台', code: 'PLATFORM', isActive: true } })
    .catch(() => console.log('Tenant already exists'));
  const tenant = await prisma.tenant.findUnique({ where: { code: 'PLATFORM' } });
  await prisma.user.create({ data: { tenantId: tenant.id, username: 'admin', password: hash, realName: '超级管理员', role: 'SUPER_ADMIN', isActive: true } })
    .catch(() => console.log('Admin already exists'));
  console.log('Done');
  await prisma.\$disconnect();
})()
"
```

---

## 日常运维

### 查看状态
```bash
ssh -i C:/Users/23791/.ssh/id_rsa root@120.77.144.5 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

### 查看日志
```bash
# 后端日志
docker logs panlei-backend -f --tail 50

# 前端（nginx）日志
docker logs panlei-frontend -f --tail 20
```

### 重启服务
```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
```

---

## 代码更新部署流程

```bash
# 1. 本地修改代码

# 2. 上传修改的文件到服务器
scp -i "C:/Users/23791/.ssh/id_rsa" -r packages/backend/src root@120.77.144.5:/root/panlei/packages/backend/
scp -i "C:/Users/23791/.ssh/id_rsa" -r packages/frontend/src root@120.77.144.5:/root/panlei/packages/frontend/

# 3. 重新构建（--no-cache 如有依赖变更）
ssh -i "C:/Users/23791/.ssh/id_rsa" root@120.77.144.5 'cd /root/panlei && docker compose -f docker-compose.prod.yml --env-file .env build backend'

# 4. 重启
ssh -i "C:/Users/23791/.ssh/id_rsa" root@120.77.144.5 'cd /root/panlei && docker compose -f docker-compose.prod.yml up -d --no-deps backend'

# 5. 如有表结构变更，运行
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"
```

---

## 已知部署注意事项

| 问题 | 解决方案 |
|------|---------|
| Prisma 二进制不兼容 Alpine | `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` + `apk add openssl` |
| npm/pnpm 被墙 | `--registry=https://registry.npmmirror.com` |
| Prisma 引擎被墙 | `ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma` |
| bcrypt 编译需要工具链 | `apk add --no-cache python3 make g++` |
| nginx 启动时后端未就绪 | `resolver 127.0.0.11` + `set $backend_host backend` |
| nginx proxy_pass 尾斜杠导致 `/api` 前缀被剥掉 | `proxy_pass http://backend:3000;`（去掉末尾 `/`），否则后端收到 `/auth/...` 而非 `/api/auth/...`，返回 404 |
| npx prisma 下载最新版（v7+不兼容） | 改用 `pnpm exec prisma` 或 `npm install -g prisma@5.22.0` |
| 无 migrations 目录 | 用 `prisma db push` 替代 `prisma migrate deploy` |
