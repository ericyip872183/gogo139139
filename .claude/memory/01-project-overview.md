# 项目概述

> 本文档是盼蕾项目的快速参考指南，包含项目定位、技术栈、架构、端口分配等核心信息。

---

## 一、项目定位

**名称**：盼蕾平台 — 中医/医学 SaaS 一体化教学考试平台

**定位**：
- 考试母本系统（全模块共用核心）
- 可插拔专业模块（独立界面）
- 硬件实操对接 + 多维度统一评分

**用户**：中医/医学院校（机构）、教师、学生

**角色权限（6 级）**：
| 角色 | 代码 | 权限范围 |
|------|------|---------|
| 超级管理员 | SUPER_ADMIN | 全平台：机构管理、模块授权、所有数据 |
| 机构管理员 | TENANT_ADMIN | 本机构：用户/题库/考试/评分/成绩 |
| 班级管理员 | CLASS_ADMIN | 本班级：用户管理、班级管理 |
| 教师 | TEACHER | 本机构：教学/出题/评分/管理 |
| 学生 | STUDENT | 本机构：学习/考试/实训操作 |

---

## 二、技术栈

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | 3.x | 组合式 API |
| TypeScript | 5.x | 严格模式，禁止 any |
| Vite | 5.x | 构建工具 |
| Element Plus | 2.x | UI 组件库 |
| Pinia | 2.x | 状态管理 |
| Vue Router | 4.x | 路由 |
| ECharts | 5.x | 数据可视化（二期） |

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | 10.x | 后端框架 |
| Node.js | 20 | 运行环境 |
| Prisma | 5.22.0 | ORM |
| MySQL | 8.0 | 数据库 |
| Redis | 7.x | 缓存/验证码 |
| ioredis | 7.x | Redis 客户端 |
| JWT + bcrypt | - | 认证/加密 |

### 硬件通信（一期 Sprint 9）
| 技术 | 说明 |
|------|------|
| Web Serial API | 串口设备通信 |
| Web Bluetooth API | 蓝牙设备通信 |
| Chrome 89+ | 强制要求（硬件 API） |

---

## 三、端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端开发 | 5173 | http://localhost:5173 |
| 后端开发 | 3002 | http://localhost:3002 |
| 生产前端 | 80 | nginx 反向代理 |
| 生产后端 | 3000 | 容器内端口 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |

---

## 四、目录结构

```
panlei/
├── .claude/memory/           # Claude 记忆文件（本目录）
├── docs/                     # 规划文档
│   ├── INDEX.md              # 文档目录
│   ├── PROGRESS.md           # 功能进度（每次开发前必读）
│   ├── API.md                # 接口规范
│   ├── DATABASE.md           # 数据库设计
│   ├── ARCHITECTURE.md       # 系统架构
│   ├── BACKEND.md            # 后端架构
│   ├── FRONTEND.md           # 前端架构
│   ├── DEPLOYMENT.md         # 部署架构
│   └── ...
├── packages/
│   ├── frontend/src/         # Vue3 前端
│   │   ├── layouts/          # MainLayout / ModuleLayout
│   │   ├── views/            # 页面（按模块分目录）
│   │   ├── stores/           # Pinia
│   │   ├── router/           # 路由
│   │   ├── api/              # 接口请求封装
│   │   └── utils/
│   ├── backend/src/          # NestJS 后端
│   │   ├── modules/          # 业务模块
│   │   ├── common/           # 拦截器/过滤器/装饰器
│   │   └── prisma/           # PrismaService
│   ├── shared/src/           # 共享类型和常量
│   └── hardware-bridge/src/  # 硬件通信抽象层
├── deploy/                   # 部署配置
├── docker-compose.yml        # 本地开发
├── docker-compose.prod.yml   # 生产环境
├── docker-compose.dev.yml    # 开发环境
└── CLAUDE.md                 # AI 开发指引
```

---

## 五、核心模块（Sprint 1-9 已完成）

| Sprint | 模块 | 状态 |
|--------|------|------|
| Sprint 1 | 工程搭建 + 认证 | ✅ |
| Sprint 2 | 用户与组织管理 | ✅ |
| Sprint 3 | 题库管理 | ✅ |
| Sprint 4 | 组卷与考试管理 | ✅ |
| Sprint 5 | 在线考试答题 | ✅ |
| Sprint 6 | 自动阅卷与成绩 | ✅ |
| Sprint 7 | 随时考核与评分表 | ✅ |
| Sprint 8 | SaaS 基础 + 模块框架 | ✅ |
| Sprint 9 | 硬件通信标准模块 | ✅ |

---

## 六、统一响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2026-03-28T..."
}
```

### 分页响应
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

### 错误响应
```json
{
  "code": 400,
  "message": "参数错误",
  "data": null,
  "timestamp": "..."
}
```

---

## 七、认证规范

### JWT Token
- 所有接口（除登录/重置密码/发送验证码）需携带 `Authorization: Bearer {token}`
- Token 有效期：7 天
- Payload: `{ sub, tenantId, role, iat, exp }`

### 多租户隔离
- 所有查询必须带 `tenantId` 条件
- `tenantId` 从 JWT Token 中提取，不从请求参数传入
- 超管（SUPER_ADMIN）可跨租户操作

---

## 八、开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器（前后端同时）
pnpm dev

# 仅启动前端
pnpm dev:frontend

# 仅启动后端
pnpm dev:backend

# 数据库操作
pnpm db:generate    # 生成 Prisma client
pnpm db:migrate     # 运行迁移
pnpm db:studio      # Prisma Studio GUI

# Docker 操作
docker-compose up -d        # 启动容器
docker-compose down         # 停止容器
docker-compose logs -f      # 查看日志
```

---

## 九、文件头部注释规范

**每个新建文件顶部必须有简介注释**，格式如下：

### TypeScript 文件
```typescript
/**
 * 文件：questions.service.ts
 * 说明：题目管理服务（数据库操作）
 * 权限：TEACHER+
 * 对应接口：GET/POST/PATCH/DELETE /api/questions
 */
```

### Vue 文件
```vue
<!--
  文件：QuestionsView.vue
  说明：题库管理页面（左树右列表布局）
  权限：TEACHER+
  对应接口：/api/questions/*
-->
```

---

## 十、前端入口

### 1. HTML 入口
**文件**：`packages/frontend/index.html`

```html
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

### 2. TypeScript 入口
**文件**：`packages/frontend/src/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
```

### 3. 访问网址

| 环境 | 前端网址 | 后端网址 |
|------|----------|----------|
| **开发** | http://localhost:5173 | http://localhost:3002 |
| **生产** | http://服务器 IP | http://服务器 IP:3000 |

### 4. 默认登录账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 超级管理员 | admin | admin123 |
| 机构管理员 | admin | admin123 |

---

## 十一、禁止事项

| 禁止项 | 说明 |
|--------|------|
| ❌ 使用 `any` 类型 | TypeScript 严格模式 |
| ❌ 缺少租户隔离 | 所有查询必须带 tenantId |
| ❌ 无头部注释 | 每个新文件必须有简介 |
| ❌ 直接访问数据库 | 必须通过 Prisma |
| ❌ 跳过自测 | 功能完成后必须自测并记录 |
