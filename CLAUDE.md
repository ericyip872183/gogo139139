# CLAUDE.md

每次的会话，我无论提出什么，你都先把方案给我，等我确认后再开始做，如果未得到我的确认，不要做任何的事

> 盼蕾项目 — 中医/医学 SaaS 一体化教学考试平台

---

## 每次新会话开始必须按以下顺序操作

1. 读 `.claude/memory/MEMORY.md` — 了解记忆系统结构
2. 读 `.claude/memory/ops/会话检查清单.md` — 查看开始检查项
3. 读 `docs/PROGRESS.md` — 了解当前功能完成状态

---

## 记忆系统

`.claude/memory/` 目录，分层结构：

- `core/` — 项目概览、开发规范、用户偏好（每次必读）
- `domain/` — 后端模块、前端架构、部署运维（按需读）
- `integrations/` — 豆包大模型、企业微信、阿里云OSS（对接时读）
- `ops/` — 会话检查清单、常见问题速查、Bug修复经验（操作时读）

入口：`.claude/memory/MEMORY.md`

---

## 快速参考

### 开发命令
```bash
pnpm install          # 安装依赖
pnpm dev              # 启动前后端（前端 5173，后端 3002）
pnpm dev:frontend     # 仅前端
pnpm dev:backend      # 仅后端
pnpm db:generate      # 生成 Prisma client
pnpm db:migrate       # 运行迁移
pnpm db:studio        # Prisma Studio
docker-compose up -d  # 启动 Docker（MySQL+Redis）
```

### 核心规范
- TypeScript 严格模式：禁止使用 `any`
- 多租户隔离：所有查询必须带 `tenantId`（从 JWT 提取）
- 文件头部注释：每个新文件必须有简介
- 自测要求：功能完成后必须自己先测试
- 文档更新：完成后更新 `docs/PROGRESS.md`（❌→✅）

### 端口
| 服务 | 端口 |
|------|------|
| 前端开发 | 5173 |
| 后端开发 | 3002 |
| MySQL | 3306 |
| Redis | 6379 |

### 容器重启
```bash
docker restart panlei-backend    # 修改后端代码后
docker restart panlei-frontend   # 修改前端代码后
```

---

## 项目结构

```
panlei/
├── .claude/memory/     # 记忆系统（分层结构）
├── docs/               # 规划文档（PROGRESS.md/API.md/DATABASE.md 等）
├── packages/
│   ├── frontend/src/   # Vue 3 + TypeScript + Element Plus
│   ├── backend/src/    # NestJS + Prisma + MySQL + Redis
│   └── hardware-bridge/# Web Serial/Bluetooth
└── deploy/             # 部署配置
```

## 当前进度

Sprint 1-9 全部完成（100%）。详细进度见 `docs/PROGRESS.md`
