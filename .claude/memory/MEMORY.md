# 盼蕾项目 - Memory 索引

> 本文件是 `.claude/memory/` 目录的入口索引。**每次新会话开始时，必须首先浏览本文件，了解各记忆文件的作用和读取时机。**

---


## 记忆文件清单

| # | 文件名 | 作用 | 何时读取 |
|---|--------|------|----------|
| 01 | [01-project-overview.md](./01-project-overview.md) | 项目概述、技术栈、核心架构、端口分配 | 新会话开始、了解项目背景时 |
| 02 | [02-development-workflow.md](./02-development-workflow.md) | 开发工作流（开发前/中/后规范） + 强制执行规则 | 开始开发任何功能前 |
| 03 | [03-debugging-testing.md](./03-debugging-testing.md) | 调试规范、自动测试、日志管理、自验证 | 调试问题时、功能完成后 |
| 04 | [04-container-deployment.md](./04-container-deployment.md) | 容器规范、部署流程、Git 提交规范 | 部署时、提交代码时 |
| 05 | [05-ai-common-issues.md](./05-ai-common-issues.md) | AI 模块通用规范、常见问题、调试技巧 | 开发 AI 相关功能时 |
| 05a | [05a-doubao-integration.md](./05a-doubao-integration.md) | 豆包大模型对接文档 | 使用豆包模型时 |
| 05b | [05b-wechat-work-integration.md](./05b-wechat-work-integration.md) | 企业微信 API 对接文档 | 对接企业微信时 |
| 05c | [05c-aliyun-oss-integration.md](./05c-aliyun-oss-integration.md) | 阿里云 OSS 对象存储对接文档 | 上传文件获取在线 URL 供 AI 访问时 |
| 06 | [06-session-checklist.md](./06-session-checklist.md) | 项目结束/开始检查清单、记忆更新 | 会话结束/开始时 |
| 00 | [00-migration-prompt.md](./00-migration-prompt.md) | 新项目迁移提示词（首次执行后删除） | 复制记忆到新项目时 |
| 07 | [07-restart-solutions.md](./07-restart-solutions.md) | 常见问题与重启解决方案速查 | 遇到启动错误时 |
| 08 | [08-user-preferences.md](./08-user-preferences.md) | 用户偏好与协作习惯 | 持续更新，会话中参考 |
| 11 | [11-bug-fix-skills.md](./11-bug-fix-skills.md) | Bug 修复技能库（通用+项目特定） | 修复 Bug 前必读 |
| 09 | [09-hardware-communication.md](./09-hardware-communication.md) | 硬件通信模块架构、使用经验、常见问题 | 开发硬件相关功能时 |
| 10 | [10-browser-automation.md](./10-browser-automation.md) | AI 浏览器自动化配置（读取官方文档） | 需要读取技术文档时 |

---

## 快速导航

### 我开始一个新功能开发
1. 读 [02-development-workflow.md](./02-development-workflow.md) — 了解完整开发流程
2. 读 [02-development-workflow.md 的第八章「强制执行规则」](./02-development-workflow.md#八强制执行规则) — **必须遵守的规则**
3. 读 `docs/PROGRESS.md` — 确认当前进度
4. 读 `docs/API.md` / `docs/DATABASE.md` — 确认接口和表结构

### 我遇到调试问题
1. 读 [07-restart-solutions.md](./07-restart-solutions.md) — 查看常见错误解决方案
2. 读 [03-debugging-testing.md](./03-debugging-testing.md) — 了解调试规范
3. 执行自动调试脚本（见文档）

### 我要提交代码/部署
1. 读 [04-container-deployment.md](./04-container-deployment.md) — 部署流程和 Git 规范
2. 读 [06-session-checklist.md](./06-session-checklist.md) — 检查完成项

### 我要对接新大模型/企业微信
1. AI 通用问题 → 读 [05-ai-common-issues.md](./05-ai-common-issues.md)
2. 豆包大模型 → 读 [05a-doubao-integration.md](./05a-doubao-integration.md)
3. 企业微信对接 → 读 [05b-wechat-work-integration.md](./05b-wechat-work-integration.md)
4. 参考 `docs/大模型 API 对接完全指南.md` — 详细对接文档

### 我要开发硬件相关功能
1. 读 [09-hardware-communication.md](./09-hardware-communication.md) — 硬件通信架构和常见问题
2. 参考 `packages/hardware-bridge/src/` — 硬件模块源码

### 我要结束当前会话
1. 读 [06-session-checklist.md](./06-session-checklist.md) — 完成检查清单
2. 更新对应的记忆文件（如有新发现）

---

## 文件长度限制说明

**重要：** Claude Code 读取文件时有以下限制：

- **MEMORY.md**：只读取前 **200 行**，超出部分会被截断
- **其他记忆文件**：建议控制在 **500 行** 以内，过长会影响读取效率
- **单个文件大小限制**：不建议超过 50KB

### 优化策略
1. 使用简洁的语言，避免冗余
2. 复杂内容拆分成多个文件
3. 定期清理过时的记忆
4. 使用表格代替长段落

---

## 记忆更新规则

| 触发场景 | 更新哪个文件 | 说明 |
|----------|-------------|------|
| 用户明确说"记住这个" | 08-user-preferences.md | 记录用户偏好 |
| 发现新的调试技巧 | 07-restart-solutions.md | 添加到常见问题 |
| 完成新功能开发 | 02-development-workflow.md | 更新检查清单 |
| 用户纠正我的做法 | 08-user-preferences.md | 记录"不要怎么做" |
| AI 功能遇到新问题 | 05-ai-common-issues.md | 更新常见问题汇总 |
| 对接豆包大模型 | 05a-doubao-integration.md | 更新豆包对接信息 |
| 对接新的大模型 | 创建 `05{x}-{模型名}-integration.md` | 按模板创建新文档 |
| 对接企业微信 | 05b-wechat-work-integration.md | 更新企业微信对接进度 |
| 部署流程有变化 | 04-container-deployment.md | 更新部署步骤 |
| 开发硬件相关功能 | 09-hardware-communication.md | 记录硬件通信经验 |

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-03-28 | 初始建立，8 个核心记忆文件 |
| v1.1 | 2026-03-28 | 新增企业微信对接文档，API 对接文档分离 |
| v1.2 | 2026-03-28 | 新增硬件通信记忆，优化 AI 功能常见问题汇总 |
| v1.3 | 2026-03-28 | 新增「强制执行规则」章节，建立规则执行保证机制 |
| v1.4 | 2026-03-28 | 大模型对接文件细分：AI 通用规范 + 豆包对接文档 |
| v1.5 | 2026-03-28 | 新增「规则 0：必须先确认后执行」为最高优先级规则 |
| v1.6 | 2026-03-28 | 优化规则 0 为「分级授权机制」，提高执行效率 |
| v1.7 | 2026-03-28 | 豆包文档新增文件上传/OCR/文档提取功能，以用户提供的资料为准 |
| v1.8 | 2026-03-28 | 同步数据库真实数据到文档，模型价格和EP接入点ID以数据库为准 |
| v1.9 | 2026-03-28 | 新增「文件处理决策树」，实测发现 input_file 不被部分模型支持，优化 PDF 处理方案 |
| v2.0 | 2026-03-28 | 新增阿里云 OSS 对接文档(05c)，用于上传文件获取在线 URL 供 AI 访问 |
| v2.1 | 2026-03-29 | 新增浏览器自动化配置(10)，解决读取官方文档被反爬虫阻挡的问题 |
