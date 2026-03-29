# 会话检查清单

> 本文档用于项目会话结束时的检查和下次会话开始时的准备。**每次会话结束和开始时必须执行。**

---

## 一、会话结束检查清单

当你（用户）说"准备结束项目"或"要去别的项目了"时，我必须执行以下检查：

### 1.1 工作完成度检查

- [ ] 本次会话完成的功能是否已自测？⚠️ **规则 7**
- [ ] 自测结果是否已记录到 `03-debugging-testing.md`？
- [ ] `docs/PROGRESS.md` 是否已更新？⚠️ **规则 1（强制）**
- [ ] 如有新增接口，`docs/API.md` 是否已更新？⚠️ **规则 2**
- [ ] 如有新增数据表，`docs/DATABASE.md` 是否已更新？⚠️ **规则 3**
- [ ] 新建文件是否都有头部注释？⚠️ **规则 4**
- [ ] 是否未使用 `any` 类型？⚠️ **规则 5**
- [ ] 数据库查询是否都带 `tenantId`？⚠️ **规则 6**
- [ ] 中间文件是否已清理？⚠️ **规则 8**
- [ ] 代码是否已提交到 Git 或提醒用户提交？

### 1.2 文档更新检查

- [ ] 如有新的调试经验，`07-restart-solutions.md` 是否已更新？
- [ ] 如有新的用户偏好，`08-user-preferences.md` 是否已更新？
- [ ] 如有新的 API 对接，`05-api-integration-template.md` 是否已更新？

### 1.3 记忆更新检查

**必须询问用户**：
1. "本次会话是否有需要特别记住的工作习惯或偏好？"
2. "是否有需要记录到记忆中的重要决策或注意事项？"

### 1.4 提交提醒

**如有代码变更，必须提醒**：

```markdown
## 📝 提交提醒

本次会话的变更内容：
- 后端：xxx
- 前端：xxx
- 文档：xxx

建议提交命令：
```bash
git add <变更文件>
git commit -m "feat: xxx"
```

是否需要我帮你准备提交？
```

### 1.5 问题记录

**如有未完成或遗留问题，必须记录**：

```markdown
## ⏳ 遗留问题

1. 问题描述：xxx
   影响范围：xxx
   建议解决方案：xxx
   优先级：高/中/低
```

---

## 二、会话开始准备清单

### 2.0 最高优先级检查 ⚠️

**每次会话开始前必须确认：**

- [ ] **已读 `08-user-preferences.md` 的「最高优先级规则」** 🔴
- [ ] **明确记住：分级授权机制（一次确认，全程授权）**
- [ ] **记住需要额外确认的操作：数据库迁移、Git 提交、部署**

---

### 2.1 首次会话准备（新项目）

- [ ] 读 `MEMORY.md` — 了解记忆系统结构
- [ ] 读 `01-project-overview.md` — 了解项目背景
- [ ] 读 `docs/PROGRESS.md` — 了解当前进度
- [ ] 读 `docs/INDEX.md` — 了解文档结构
- [ ] 确认用户本次会话的目标

### 2.2 后续会话准备

- [ ] 读 `MEMORY.md` — 回顾记忆文件
- [ ] 读 `06-session-checklist.md` 的「上次会话遗留问题」— 了解待办事项
- [ ] 读 `docs/PROGRESS.md` — 确认进度状态
- [ ] 询问用户本次会话的目标

### 2.3 会话开始问候语

```markdown
## 👋 欢迎回来！

**项目状态**：
- Sprint 1-9：全部完成 ✅
- 当前阶段：部署准备/二期规划

**上次会话遗留**：
- （如有）列出待办事项

**本次会话计划**：
请问您今天想做什么？
1. 继续开发新功能
2. 修复 Bug
3. 优化现有代码
4. 部署相关
5. 其他（请说明）
```

---

## 三、记忆更新规则

### 3.1 何时更新记忆

| 触发场景 | 更新哪个文件 | 示例 |
|----------|-------------|------|
| 用户说"记住这个" | 08-user-preferences.md | "记住，我不喜欢用 emoji" |
| 用户纠正我的做法 | 08-user-preferences.md | "不要先提交代码，先给我看 diff" |
| 发现新的调试技巧 | 07-restart-solutions.md | "500 错误是因为 xxx" |
| 完成新功能开发 | 03-debugging-testing.md | 记录测试过程和结果 |
| 对接新的外部 API | 05-api-integration-template.md | "新增讯飞 API 对接" |
| 部署流程有变化 | 04-container-deployment.md | "新增 xxx 部署步骤" |

### 3.2 记忆更新格式

```markdown
### YYYY-MM-DD - 标题

**内容**：具体记忆内容

**来源**：用户口述 / 开发发现 / 问题修复

**适用场景**：何时会用到这条记忆
```

### 3.3 记忆删除规则

以下情况应删除记忆：
- 记忆内容已过时
- 记忆内容被证明是错误的
- 用户明确要求删除

---

## 四、项目完成度评估模板

### 4.1 Sprint 完成度

```markdown
## Sprint 完成度

| Sprint | 功能 | 完成度 |
|--------|------|--------|
| Sprint 1 | 工程搭建 + 认证 | 100% ✅ |
| Sprint 2 | 用户与组织管理 | 100% ✅ |
| ... | ... | ... |
| Sprint 9 | 硬件通信 | 100% ✅ |

**总体进度**：100%（一期完成）
```

### 4.2 功能完成度

```markdown
## 功能完成度

### 核心功能
- [x] 账号登录
- [x] 用户管理
- [x] 题库管理
- [x] 组卷考试
- [x] 在线答题
- [x] 自动阅卷
- [x] 评分表
- [x] 超管后台

### AI 功能
- [x] AI 对话
- [x] AI 图片生成
- [x] 题库 AI 导入

### 硬件功能
- [x] Web Serial
- [x] Web Bluetooth
- [x] 调试面板
```

---

## 五、上次会话遗留问题

> 记录上次会话未完成或遗留的问题

---

### （暂无）

> 此处记录每次会话结束时的遗留问题，下次会话开始时首先查看

---

## 六、会话日志

> 记录每次会话的主要工作内容

### 2026-03-28 - 同步数据库真实数据到文档

**工作内容**：
- 查询数据库 `ai_providers` 和 `ai_models` 表
- 更新 `05a-doubao-integration.md` 模型矩阵章节
- 以数据库真实数据为准：EP接入点ID、模型价格、模型状态
- 创建同步提示词模板：`.claude/prompts/sync-ai-providers.md`

**数据库导出数据**：
- 火山引擎豆包（已启用）
  - Doubao-Seed-2.0-lite：¥0.8/千tokens（输入）、¥8/千tokens（输出）
  - Doubao-Seed-2.0-pro：¥1/千tokens（输入）、¥2/千tokens（输出）
  - Doubao-Seedream-5.0-lite：图片生成模型
- MiniMax（已启用，暂无模型配置）

**关键更新**：
- 明确模型 ID 必须使用 EP 接入点 ID（如 `ep-20260315163053-ns7kz`）
- 更新所有代码示例中的模型 ID
- 更新价格信息以数据库为准

**创建的文件**：
1. `.claude/prompts/sync-ai-providers.md` - AI 服务商数据同步提示词模板

**最终状态**：✅ 完成

---

### 2026-03-28 - 豆包文档新增文件上传/OCR 功能

**工作内容**：
- 更新 `05a-doubao-integration.md` - 全面更新豆包对接文档
- 新增「文件上传」章节（通用接口、Python 代码）
- 新增「图片 OCR 识别」章节（完整代码示例）
- 新增「文档文字提取」章节（完整代码示例）
- 新增「关键注意事项」章节（字段使用规则）
- 更新模型矩阵，新增多模态模型（doubao-seed-2-0-lite）
- 更新 `05-ai-common-issues.md` - 新增文件上传问题
- 更新 `MEMORY.md` - 版本号至 v1.7

**核心更新内容**：
- 明确文件上传接口：`https://ark.cn-beijing.volces.com/api/v3/files`
- 明确字段使用规则：图片用 `input_image`，文档用 `input_file`
- 推荐模型：`doubao-seed-2-0-lite-260215`（专为 OCR 优化）
- 完整上传 → OCR 识别流程代码

**最终状态**：✅ 完成

---

### 2026-03-28 - 优化为「分级授权机制」

**工作内容**：
- 优化规则 0 从"每次确认"改为"分级授权"
- 更新 `08-user-preferences.md` - 修改最高优先级规则
- 更新 `02-development-workflow.md` - 修改规则 0 + 新增汇报模板
- 更新 `06-session-checklist.md` - 更新检查项
- 更新 `MEMORY.md` - 版本号至 v1.6

**核心改进**：
- **之前**：每次操作都需要确认
- **现在**：一次确认，全程授权（数据库迁移/Git 提交/部署除外）
- **效率提升**：减少约 80% 的确认次数

**新增内容**：
- 授权范围清单（明确哪些操作无需确认）
- 执行结果汇报模板
- 异常暂停汇报模板

**最终状态**：✅ 完成

---

### 2026-03-28 - 新增最高优先级规则「必须先确认后执行」

**工作内容**：
- 在 `08-user-preferences.md` 中新增「最高优先级规则」章节
- 在 `02-development-workflow.md` 中新增「规则 0：必须先确认后执行」
- 在 `06-session-checklist.md` 中新增「最高优先级检查」章节
- 更新 `MEMORY.md` 版本号至 v1.5

**规则内容**：
每次的会话，用户无论提出什么，都必须先把方案给用户，等用户确认后再开始做。如果未得到用户确认，不要做任何的事。

**强化位置**：
1. 08-user-preferences.md - 最高优先级规则 🔴
2. 02-development-workflow.md - 规则 0（最高优先级）
3. 06-session-checklist.md - 会话开始前必须检查

**最终状态**：✅ 完成

---

### 2026-03-28 - 大模型对接文件细分

**工作内容**：
- 删除 `05-api-integration-template.md`
- 创建 `05-ai-common-issues.md` - AI 模块通用规范
- 创建 `05a-doubao-integration.md` - 豆包大模型对接文档
- 重命名 `05-wechat-work-integration.md` → `05b-wechat-work-integration.md`
- 更新 `MEMORY.md` 索引和版本号至 v1.4

**创建的文件**：
1. 05-ai-common-issues.md - AI 模块通用规范（常见问题、调试技巧、安全规范）
2. 05a-doubao-integration.md - 豆包大模型对接文档

**删除的文件**：
1. 05-api-integration-template.md

**重命名的文件**：
1. 05-wechat-work-integration.md → 05b-wechat-work-integration.md

**最终状态**：✅ 完成

---

### 2026-03-28 - 建立强制执行规则机制

**工作内容**：
- 在 `02-development-workflow.md` 中新增「强制执行规则」章节
- 定义 10 条强制执行规则（文档更新、代码质量、测试验证、模块特定）
- 在 `06-session-checklist.md` 中添加规则检查项
- 建立规则执行检查清单

**更新的文件**：
1. 02-development-workflow.md - 新增第八章「强制执行规则」
2. 06-session-checklist.md - 工作完成度检查新增规则引用
3. MEMORY.md - 版本号更新至 v1.3

**强制规则清单**：
- 规则 1：功能完成后必须更新 PROGRESS.md
- 规则 2：新增接口必须更新 API.md
- 规则 3：新增数据表必须更新 DATABASE.md
- 规则 4：新文件必须有头部注释
- 规则 5：禁止使用 any 类型
- 规则 6：所有查询必须带 tenantId
- 规则 7：功能完成后必须自测
- 规则 8：调试完成后必须清理中间文件
- 规则 9：AI 功能遇到新问题必须记录
- 规则 10：硬件开发必须参考硬件记忆

**最终状态**：✅ 完成

---

### 2026-03-28 - 记忆系统优化（硬件通信 + AI 问题汇总）

**工作内容**：
- 新增 `09-hardware-communication.md` 硬件通信记忆文件
- 优化 `05-api-integration-template.md` 新增常见问题汇总章节
- 更新 `MEMORY.md` 索引和版本号至 v1.2

**创建的文件**：
1. 09-hardware-communication.md - 硬件通信模块记忆

**更新的文件**：
1. 05-api-integration-template.md - 新增第五章「常见问题汇总」
2. MEMORY.md - 新增硬件通信导航项和记忆更新规则

**最终状态**：✅ 完成

---

### 2026-03-28 - 记忆系统建立

**工作内容**：
- 创建 `.claude/memory/` 文件夹结构
- 创建 8 个核心记忆文件
- 建立开发/调试/部署规范

**创建的文件**：
1. MEMORY.md - 主索引
2. 01-project-overview.md - 项目概述
3. 02-development-workflow.md - 开发工作流
4. 03-debugging-testing.md - 调试规范
5. 04-container-deployment.md - 容器与部署
6. 05-api-integration-template.md - API 对接模板
7. 06-session-checklist.md - 会话检查清单
8. 07-restart-solutions.md - 重启解决方案（待填充）
9. 08-user-preferences.md - 用户偏好（待填充）

**最终状态**：✅ 完成
