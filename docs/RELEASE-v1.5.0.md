# 盼蕾平台 v1.5.0 版本说明

> 发布日期：2026-03-24
> 版本类型：功能更新

---

## 新增功能

### AI 平台管理系统（超管专属）

**后端实现**
- `AiAdminController` - AI 服务商/模型/配额管理控制器
  - `GET /api/ai/admin/providers` - 获取所有服务商
  - `POST /api/ai/admin/providers` - 创建服务商
  - `PUT /api/ai/admin/providers/:id` - 更新服务商
  - `DELETE /api/ai/admin/providers/:id` - 删除服务商
  - `GET /api/ai/admin/models` - 获取所有模型
  - `POST /api/ai/admin/models` - 创建模型
  - `PUT /api/ai/admin/models/:id` - 更新模型
  - `DELETE /api/ai/admin/models/:id` - 删除模型
  - `GET /api/ai/admin/tenant-models` - 获取机构模型配置
  - `POST /api/ai/admin/tenant-models` - 为机构设置模型
  - `DELETE /api/ai/admin/tenant-models` - 移除机构模型
  - `GET /api/ai/admin/quotas` - 获取机构配额
  - `POST /api/ai/admin/quotas` - 分配配额
  - `GET /api/ai/admin/stats/platform` - 平台使用统计

- `AiAdminService` - AI 平台管理服务
  - 服务商 CRUD、模型 CRUD、机构模型配置、配额管理、预警管理、使用统计

- `AiTenantController` - 机构 AI 服务接口
  - `GET /api/ai/tenant/services` - 获取本机构可用服务
  - `GET /api/ai/tenant/stats` - 机构使用统计
  - `POST /api/ai/tenant/recharge` - 创建充值订单
  - `POST /api/ai/tenant/quota-request` - 申请增加配额

**数据模型（Prisma）**
- `AiProvider` - AI 服务商（火山引擎豆包等）
- `AiModel` - AI 模型（全局模型池）
- `TenantAiQuota` - 机构配额（按服务商隔离）
- `TenantAiModel` - 机构模型配置（按场景：通用/模拟病人/题目导入/OCR）
- `AiAlert` - AI 预警记录（配额不足时触发）

**前端实现**
- `AiPlatformView.vue` - AI 平台管理主页面（5 个 Tab）
  - 服务商配置
  - 模型管理
  - 机构模型配置
  - 配额管理
  - 使用统计（ECharts 图表）

- `TenantServiceCenterView.vue` - 机构 AI 服务中心
  - 我的服务（可用模型列表）
  - 使用统计
  - 充值管理
  - 配额预警

- UI 组件（8 个）
  - `ProviderManagement.vue` - 服务商管理
  - `ModelManagement.vue` - 模型管理
  - `TenantModelConfig.vue` - 机构模型配置
  - `QuotaManagement.vue` - 配额管理
  - `UsageStatistics.vue` - 使用统计（ECharts）
  - `MyServices.vue` - 我的服务
  - `TenantStats.vue` - 机构统计
  - `RechargeManagement.vue` - 充值管理
  - `TenantAlerts.vue` - 配额预警

---

## Bug 修复

### 路由守卫问题
- **问题**：Vue Router 4 中路由守卫使用 `return` 语法而非 `next()` 导致导航失效
- **修复**：`packages/frontend/src/router/index.ts` 中 `beforeEach` 改为 `next()` 语法
- **影响**：修复点击菜单无响应的问题

### 菜单缺失问题
- **问题**：SUPER_ADMIN 角色菜单项过少，缺少题库/试卷/考试/评分表入口
- **修复**：`packages/frontend/src/layouts/MainLayout.vue` 中为 SUPER_ADMIN 添加完整菜单
- **影响**：超管可以访问所有管理功能

### API Token 携带问题
- **问题**：`TenantModelConfig.vue` 和 `QuotaManagement.vue` 中使用原生 `fetch` 时未携带 Token
- **修复**：在请求头中添加 `Authorization: Bearer {token}`
- **影响**：修复 401 认证错误

---

## 技术改进

### 全局错误处理
- 添加 `app.config.errorHandler` 捕获 Vue 组件错误
- 添加 `unhandledrejection` 监听器捕获 Promise 错误
- 错误信息输出到控制台便于调试

### 构建优化
- 后端 NestJS 构建成功
- 前端 Vite 构建成功（15.16s）
- 代码分割优化，AI 平台管理单独打包

---

## 文件变更清单

### 新增文件（23 个）
**后端**
- `packages/backend/src/modules/ai/ai-admin.controller.ts`
- `packages/backend/src/modules/ai/ai-admin.service.ts`
- `packages/backend/src/modules/ai/ai-tenant.controller.ts`
- `packages/backend/src/modules/ai/dto/ai-admin.dto.ts`

**前端**
- `packages/frontend/src/api/ai-admin.ts`
- `packages/frontend/src/views/ai/AiPlatformView.vue`
- `packages/frontend/src/views/ai/TenantServiceCenterView.vue`
- `packages/frontend/src/views/ai/components/ProviderManagement.vue`
- `packages/frontend/src/views/ai/components/ModelManagement.vue`
- `packages/frontend/src/views/ai/components/TenantModelConfig.vue`
- `packages/frontend/src/views/ai/components/QuotaManagement.vue`
- `packages/frontend/src/views/ai/components/UsageStatistics.vue`
- `packages/frontend/src/views/ai/components/MyServices.vue`
- `packages/frontend/src/views/ai/components/TenantStats.vue`
- `packages/frontend/src/views/ai/components/RechargeManagement.vue`
- `packages/frontend/src/views/ai/components/TenantAlerts.vue`

### 修改文件（16 个）
- `packages/backend/prisma/schema.prisma` - 新增 AI 相关数据模型
- `packages/frontend/src/layouts/MainLayout.vue` - 修复 SUPER_ADMIN 菜单
- `packages/frontend/src/router/index.ts` - 修复路由守卫语法
- `packages/frontend/src/main.ts` - 添加全局错误处理
- 其他文档和配置更新

---

## 升级步骤

### 开发环境
```bash
# 拉取最新代码
git pull origin master

# 安装依赖
pnpm install

# 生成 Prisma 客户端
pnpm run db:generate

# 启动开发服务器
pnpm run dev
```

### 生产环境
```bash
# 构建
pnpm run build:backend
pnpm run build:frontend

# 重启服务
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 注意事项

1. **数据库迁移**：AI 相关表需要执行 Prisma migrate
2. **权限要求**：AI 平台管理仅限 SUPER_ADMIN 访问
3. **API 配置**：需要先在 AI 平台管理页配置服务商（如火山引擎豆包）

---

## 相关文档

- `docs/PROGRESS.md` - 功能进度追踪
- `docs/API.md` - API 接口文档
- `docs/DATABASE.md` - 数据库设计文档
- `docs/AI 大模型管理方案.md` - AI 功能设计方案

---

**提交记录**
- `9c1a030` feat: AI 平台管理系统完整实现 (v1.5.0)
- `d5c56fa` chore: 更新文档和修复 (#1)
