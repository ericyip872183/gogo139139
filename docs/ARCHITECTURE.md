# 盼蕾平台 — 系统架构总览

> **本文件描述整体系统架构、技术选型、模块关系图和集成规范。开发新模块或理解系统全貌时查阅。**

---

## 系统定位

中医/医学 SaaS 一体化教学考试平台：**考试母本系统**（所有模块共用核心）+ **可插拔专业模块**（独立界面）+ **硬件实操对接** + **多维度统一评分**

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | Vue 3.x |
| 前端构建 | Vite | 5.x |
| 前端 UI | Element Plus | 2.x |
| 前端状态 | Pinia | 2.x |
| 前端路由 | Vue Router 4 | 4.x |
| 前端图表 | ECharts | 5.x（二期） |
| 后端框架 | NestJS | 10.x |
| 后端语言 | Node.js + TypeScript | Node 20 |
| ORM | Prisma | 5.22.0 |
| 数据库 | MySQL 8 | 8.0 |
| 缓存 | Redis（ioredis） | 7.x |
| 认证 | JWT + bcrypt | - |
| 实时通信 | Socket.io | 二期 |
| 文件存储 | 阿里云 OSS | 部署时对接 |
| 硬件通信 | Web Serial API + Web Bluetooth API | Chrome 89+ |
| 容器化 | Docker + Docker Compose | - |
| 反向代理 | nginx | alpine |

---

## 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│              Chrome 89+ (Web Serial/Bluetooth)               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/WebSocket  port 80
┌──────────────────────▼──────────────────────────────────────┐
│                    nginx (前端容器)                           │
│   /          → 静态前端文件 (Vue3 SPA)                       │
│   /api/      → 反向代理 → backend:3000                       │
│   /socket.io/→ 反向代理 → backend:3000                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP  port 3000
┌──────────────────────▼──────────────────────────────────────┐
│                NestJS 后端 (backend容器)                      │
│   全局前缀: /api                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ AuthModule │ UsersModule │ OrgsModule │ QuestionsModule│  │
│   │ PapersModule │ ExamsModule │ ExamRoomModule           │  │
│   │ ScoresModule │ ScoreTablesModule │ AdminModule        │  │
│   └──────────────────────────────────────────────────────┘  │
└──────┬────────────────────────────┬───────────────────────┘
       │ Prisma ORM                 │ ioredis
┌──────▼──────┐              ┌──────▼──────┐
│  MySQL 8    │              │   Redis 7   │
│ panlei_prod │              │  验证码/缓存 │
└─────────────┘              └─────────────┘
```

---

## 目录结构

```
panlei/
├── docs/                          # 规划文档（本目录）
│   ├── INDEX.md                   # 文档目录
│   ├── PROGRESS.md                # 功能进度追踪
│   ├── ARCHITECTURE.md            # 本文件
│   ├── MODULES_CORE.md            # 核心模块详解
│   ├── MODULES_SPECIALTY.md       # 专业模块详解
│   ├── DATABASE.md                # 数据库设计
│   ├── API.md                     # 接口规范
│   ├── FRONTEND.md                # 前端架构
│   ├── BACKEND.md                 # 后端架构
│   └── DEPLOYMENT.md              # 部署架构
├── packages/
│   ├── frontend/                  # Vue3 前端
│   │   └── src/
│   │       ├── layouts/           # MainLayout / ModuleLayout
│   │       ├── views/             # 页面（按模块分目录）
│   │       ├── stores/            # Pinia 状态
│   │       ├── router/            # 路由配置
│   │       ├── api/               # 接口请求封装
│   │       └── utils/
│   ├── backend/                   # NestJS 后端
│   │   └── src/
│   │       ├── modules/           # 业务模块
│   │       ├── common/            # 拦截器/过滤器/装饰器
│   │       └── prisma/            # PrismaService
│   └── hardware-bridge/           # 硬件通信抽象层
│       └── src/
│           ├── core/              # 抽象接口
│           ├── bluetooth/         # Web Bluetooth
│           ├── serial/            # Web Serial
│           ├── protocol/          # 协议解析
│           └── demo/              # 调试面板/模拟器
├── deploy/                        # 部署配置
│   ├── nginx.conf
│   └── deploy.sh
├── docker-compose.yml             # 本地开发环境
├── docker-compose.prod.yml        # 生产环境
└── CLAUDE.md                      # AI 开发指引
```

---

## 多租户架构

- **所有业务数据**均挂在 `tenantId` 下
- `tenantId` 从 **JWT Token** 中提取，不从请求参数传入
- 超管（SUPER_ADMIN）可跨租户操作
- 教师/学生只能操作本租户数据（中间件自动隔离）

---

## 模块集成规范

### 专业模块如何接入母本

```
1. 后端：在 AdminModule 中注册模块 code（如 "TCM_PULSE"）
2. 前端：在 router/modules/ 下创建模块路由文件
3. 前端：使用 ModuleLayout 作为布局（含「返回母本」导航）
4. 数据回传：考核成绩通过 /api/scores 统一写入母本
5. 授权：TenantModule 表控制机构是否有权访问该模块
```

### 模块权限守卫

```typescript
// 路由 meta 中声明所需模块
{ meta: { requiresModule: 'TCM_PULSE' } }

// 路由守卫自动检查 auth.user.modules 中是否包含
```

---

## 角色权限体系

| 角色 | 代码 | 权限范围 |
|------|------|---------|
| 超级管理员 | SUPER_ADMIN | 全平台：机构管理、模块授权、所有数据 |
| 教师管理员 | TEACHER | 本机构：用户/题库/考试/评分/成绩 |
| 学生 | STUDENT | 本机构：考试答题/查看成绩/实训 |

---

## 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2026-03-19T..."
}
```

分页响应：
```json
{
  "code": 200,
  "data": {
    "total": 100,
    "list": [...],
    "page": 1,
    "pageSize": 20
  }
}
```
