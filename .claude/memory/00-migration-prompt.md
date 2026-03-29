# 🚀 新项目首次执行提示词

> **触发条件**：复制 `.claude/memory/` 目录到新项目后首次启动
> **执行后**：删除本文件，避免重复执行

---

## 执行步骤

### 第一步：读取当前项目技术栈

请询问用户或检查项目文件，确定以下信息：

```
前端框架：Vue 3 / React / Angular / 其他
后端框架：NestJS / Express / Django / 其他
数据库：MySQL / MongoDB / PostgreSQL / 其他
部署方式：Docker / K8s / 传统部署
特殊服务：AI 服务商 / 云存储 / 消息队列
```

### 第二步：清理项目特定技能

打开 `11-bug-fix-skills.md`，执行以下规则：

**保留规则**：
- ✅ 标记为 `🌐 通用` 的所有技能
- ✅ 技术栈匹配当前项目的 `🎯 项目特定` 技能

**删除规则**：
- ❌ 技术栈不匹配的 `🎯 项目特定` 技能
- 示例：删除 `Prisma` 相关技能（如果新项目用 MongoDB）

**预览确认**：
清理前先展示将删除的技能列表，确认后再执行：

```
将删除以下技能：
- [PROJ-001] Prisma 连接 MySQL（NestJS + Prisma）
- [PROJ-002] Volcano Engine API（特定 AI 服务商）
...

将保留以下技能：
- [TOP-1] API 响应格式不匹配（通用）
- [SKILL-001] TypeScript 类型推断失败（通用）
```

### 第三步：更新文档元数据

更新 `11-bug-fix-skills.md` 头部：

```yaml
---
version: v1.0
lastUpdated: 2026-03-29
totalSkills: 8      ← 更新为清理后的数量
topPriority: 3
project: "新项目名称"
---
```

### 第四步：删除本提示词文件

执行完成后，删除本文件 `00-migration-prompt.md`，避免每次载入重复执行。

---

## 自动触发机制

**启动时检测**：
```
如果检测到本文件存在，提示：
"检测到迁移提示词，是否执行新项目初始化？"
  ├─ 是 → 执行上述步骤
  └─ 否 → 保持现状
```

**手动触发**：
- 用户说"初始化新项目"
- 用户说"清理项目特定记忆"

---

## 通用技能参考

以下技能适用于所有项目，**永远保留**：

| 技能 | 技术栈 | 说明 |
|------|--------|------|
| [TOP-1] | HTTP API | API 响应格式不匹配 |
| [SKILL-001] | TypeScript | 类型推断失败 |
| [SKILL-002] | Docker | 端口占用 EADDRINUSE |
| [SKILL-003] | Git | 合并冲突解决 |

---

## 执行示例

**场景**：从 Panlei（NestJS + Prisma）迁移到新项目（React + Express）

```
用户：初始化新项目

Claude：
┌─────────────────────────────────────┐
│  检测到迁移提示词                     │
│  当前项目：React + Express + MongoDB │
│  旧项目：Panlei（NestJS + Prisma）   │
└─────────────────────────────────────┘

将删除以下项目特定技能：
- [PROJ-001] Prisma 连接 MySQL
- [PROJ-002] Volcano Engine API
- [PROJ-003] TinyMCE 富文本配置

将保留通用技能：
- [TOP-1] API 响应格式不匹配
- [SKILL-001] TypeScript 类型推断失败
- [SKILL-002] Docker 端口占用
- ...

确认执行清理？[是/否/自定义]
```

---

## 执行完成

删除本文件后，新项目将只保留适用的通用技能 + 当前项目的特定技能。

**迁移完成！** 🎉