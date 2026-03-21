# 盼蕾平台 — 文档目录

> **本文件是所有规划文档的入口。每次开发前，先读本文件确定需要查阅哪些文档。**

---

## 文档清单

| 文件 | 作用 | 何时查阅 |
|------|------|---------|
| [INDEX.md](./INDEX.md) | 本文件，文档目录与导航 | 每次开发开始时 |
| [PROGRESS.md](./PROGRESS.md) | 功能模块进度追踪（✅/❌），每完成一个功能必须更新 | 每次开发前后 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统整体架构、模块关系图、技术选型说明 | 了解全局结构时 |
| [MODULES_CORE.md](./MODULES_CORE.md) | 母本16个核心功能模块详解、子模块拆分、与主框架对接方式 | 开发核心功能时 |
| [MODULES_SPECIALTY.md](./MODULES_SPECIALTY.md) | 8个专业拓展模块详解、独立界面规范、与母本对接接口 | 开发专业模块时 |
| [DATABASE.md](./DATABASE.md) | 所有数据表设计、字段说明、表间关系与外键依赖 | 数据库操作/新增表时 |
| [API.md](./API.md) | 全部后端接口规范、请求/响应格式、认证方式、错误码 | 前后端对接时 |
| [FRONTEND.md](./FRONTEND.md) | 前端目录结构、组件层级、路由设计、状态管理规范 | 开发前端页面时 |
| [BACKEND.md](./BACKEND.md) | 后端模块结构、Service/Controller规范、中间件、Guards | 开发后端接口时 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 服务器环境、Docker部署、环境变量、升级与回滚流程 | 部署/运维时 |

---

## 快速定位指南

### 我要开发一个新功能，从哪里开始？
1. 查 [PROGRESS.md](./PROGRESS.md) → 找到对应功能，确认状态
2. 查 [MODULES_CORE.md](./MODULES_CORE.md) 或 [MODULES_SPECIALTY.md](./MODULES_SPECIALTY.md) → 了解模块设计
3. 查 [DATABASE.md](./DATABASE.md) → 确认需要的表结构
4. 查 [API.md](./API.md) → 确认接口规范
5. 开发完成后更新 [PROGRESS.md](./PROGRESS.md)

### 我要了解某个模块怎么和母本对接？
→ [ARCHITECTURE.md](./ARCHITECTURE.md) 的「模块集成规范」章节

### 我要查某张表有哪些字段？
→ [DATABASE.md](./DATABASE.md)

### 我要查某个接口的请求格式？
→ [API.md](./API.md)

---

## 开发工作流（AI必须遵守）

1. **每次对话开始**：读 PROGRESS.md，了解当前进度
2. **开发前**：读对应模块文档，了解设计意图
3. **开发中**：严格按照 API.md 和 DATABASE.md 的规范
4. **开发完成后**：立即更新 PROGRESS.md 中对应功能的状态（❌→✅）
5. **如有计划外的新增功能**：在 PROGRESS.md 的「计划外新增」章节记录并说明原因
6. **每个新建文件顶部**：必须有该文件的简介注释

---

## 文档版本

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-03-19 | 初始规划文档建立，Sprint 1-9 已完成 |
