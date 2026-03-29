# CLAUDE.md

每次的会话，我无论提出什么，你都先把方案给我，等我确认后再开始做，如果未得到我的确认，不要做任何的事

> 盼蕾项目 — 中医/医学 SaaS 一体化教学考试平台
> 精简版（完整文档见 `.claude/memory/` 目录）

---

## ⚠️ 每次新会话开始必须按以下顺序操作

1. **读 `.claude/memory/MEMORY.md`** — 了解记忆系统结构和各文件作用
2. **读 `.claude/memory/06-session-checklist.md`** — 查看上次会话遗留问题
3. **读 `docs/PROGRESS.md`** — 了解当前功能完成状态
4. **读 `docs/INDEX.md`** — 确定本次开发需要查阅哪些文档

---

## 📚 记忆系统

所有记忆文件索引和使用说明，请查阅 `.claude/memory/MEMORY.md`

**首次会话必读**：`.claude/memory/MEMORY.md` → 了解所有记忆文件的作用

---

## 🔧 快速参考

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
- **TypeScript 严格模式**：禁止使用 `any`
- **多租户隔离**：所有查询必须带 `tenantId`（从 JWT 提取）
- **文件头部注释**：每个新文件必须有简介
- **自测要求**：功能完成后必须自己先测试
- **文档更新**：完成后更新 `docs/PROGRESS.md`（❌→✅）

### 端口分配
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

## 📁 项目结构

```
panlei/
├── .claude/memory/     # 记忆系统（9 个核心文件）
├── docs/               # 规划文档（PROGRESS.md/API.md/DATABASE.md 等）
├── packages/
│   ├── frontend/src/   # Vue 3 + TypeScript + Element Plus
│   ├── backend/src/    # NestJS + Prisma + MySQL + Redis
│   ├── shared/src/     # 共享类型和常量
│   └── hardware-bridge/# Web Serial/Bluetooth
└── deploy/             # 部署配置
```

### 后端模块（已实现）
`auth`, `users`, `organizations`, `questions`, `papers`, `exams`, `exam-room`, `scores`, `score-tables`, `admin`, `ai`

### 前端页面（已实现）
`LoginView`, `DashboardView`, `UsersView`, `OrganizationView`, `QuestionsView`, `PapersView`, `ExamsView`, `MyExamsView`, `ExamRoomView`, `ScoresView`, `ScoreTablesView`, `ScoreJudgeView`, `AdminView`, `ProfileView`, `AiPlatformView`, `TenantServiceCenterView`

---

## ✅ 当前进度

**Sprint 1-9 全部完成（100%）**：工程搭建、用户组织、题库、组卷考试、在线答题、自动阅卷、评分表、超管后台、硬件通信

**部署状态**：待部署

详细进度见 `docs/PROGRESS.md`

---

## 📖 详细文档

产品信息、技术选型、16 个核心模块详解、8 个专业模块、Sprint 详细任务、数据库表设计、完整部署步骤 — **全部移至 `.claude/memory/01-project-overview.md`**
