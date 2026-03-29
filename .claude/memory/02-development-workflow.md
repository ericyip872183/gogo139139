# 开发工作流

> 本文档规定完整的开发流程，包括开发前、开发中、开发后的所有必要步骤。**每次开发新功能时必须严格遵守。**

---

## 一、开发前准备

### 1.1 文档阅读顺序（必须按顺序）

```
1. docs/PROGRESS.md    → 了解当前功能进度状态
2. docs/INDEX.md       → 确定需要查阅哪些文档
3. docs/MODULES_CORE.md 或 docs/MODULES_SPECIALTY.md  → 了解模块设计
4. docs/DATABASE.md    → 确认所需表结构
5. docs/API.md         → 确认接口规范
```

### 1.2 开发前检查清单

- [ ] 已读 `docs/PROGRESS.md`，确认功能未开发且无冲突
- [ ] 已读对应模块文档，了解设计意图
- [ ] 已确认数据库表是否存在，如需要新建已规划好字段
- [ ] 已确认接口路径和请求/响应格式
- [ ] 已确认多租户隔离方案（tenantId 来源）

### 1.3 需求分析模板

在开始编码前，用以下模板梳理需求：

```markdown
## 本次开发任务

### 涉及数据表
- 表 1：xxx（新增/修改/使用现有）
- 表 2：xxx

### 涉及接口
- GET /api/xxx - 说明
- POST /api/xxx - 说明

### 涉及前端页面
- views/xxx/XXXView.vue

### 权限要求
- SUPER_ADMIN / TEACHER / STUDENT / ...
```

---

## 二、开发中规范

### 2.1 后端开发规范

#### Controller 层
```typescript
/**
 * 文件：xxx.controller.ts
 * 说明：XXX 控制器（HTTP 路由）
 * 权限：xxx
 */
@Controller('xxx')
export class XxxController {
  constructor(private xxxService: XxxService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryDto
  ) {
    // tenantId 从 JWT 中提取
    return this.xxxService.findAll(user.tenantId, query)
  }
}
```

#### Service 层
```typescript
/**
 * 文件：xxx.service.ts
 * 说明：XXX 管理服务（数据库操作）
 * 权限：xxx
 */
@Injectable()
export class XxxService {
  constructor(private prisma: PrismaService) {}

  // tenantId 始终作为第一个参数（多租户隔离）
  async findAll(tenantId: string, query: QueryDto) {
    return this.prisma.xxx.findMany({
      where: { tenantId, ...filters },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    })
  }
}
```

#### DTO 规范
```typescript
/**
 * 文件：create-xxx.dto.ts
 * 说明：创建 XXX 的请求 DTO
 */
export class CreateXxxDto {
  @IsString()
  @IsNotEmpty({ message: '名称不能为空' })
  name: string

  @IsOptional()
  @IsString()
  description?: string
}
```

### 2.2 前端开发规范

#### 页面文件结构
```vue
<!--
  文件：XxxView.vue
  说明：XXX 管理页面
  权限：TEACHER+
  对应接口：/api/xxx/*
-->

<template>
  <div class="xxx-view">
    <!-- 搜索栏 -->
    <!-- 操作按钮 -->
    <!-- 数据表格 -->
    <!-- 分页 -->
  </div>
</template>

<script setup lang="ts">
// 引入 API
// 引入类型
// 响应式数据
// 方法
</script>
```

#### API 调用封装
```typescript
/**
 * 文件：api/xxx.ts
 * 说明：XXX 相关接口
 */
import request from './request'

export function getXxxList(params: any) {
  return request({
    url: '/api/xxx',
    method: 'get',
    params,
  })
}
```

### 2.3 多租户隔离检查

**❌ 错误示例**：
```typescript
// 缺少 tenantId
await prisma.user.findMany({ where: { username } })
```

**✅ 正确示例**：
```typescript
// tenantId 从 JWT 中提取
const tenantId = user.tenantId
await prisma.user.findMany({ where: { tenantId, username } })
```

### 2.4 TypeScript 类型检查

**❌ 禁止使用 any**：
```typescript
const data: any = await fetch()
```

**✅ 使用接口/类型**：
```typescript
interface XxxResponse {
  id: string
  name: string
}
const data = await fetch() as XxxResponse
```

---

## 三、开发后必须做

### 3.1 自验证（必须做）

**开发完成后，必须编写调试脚本并自测**：

```bash
# 示例：测试 AI 导入功能
node test-ai-import.js
```

**自验证检查清单**：
- [ ] 接口返回数据格式正确
- [ ] 前端页面正常渲染
- [ ] 无控制台错误
- [ ] 多租户隔离正常
- [ ] 权限控制正常

### 3.2 文档更新（必须做）

| 文档 | 更新时机 |
|------|----------|
| `docs/PROGRESS.md` | 将对应功能从 ❌ 改为 ✅ |
| `docs/DATABASE.md` | 如有新增/修改数据表 |
| `docs/API.md` | 如有新增/修改接口 |
| `.claude/memory/03-debugging-testing.md` | 记录调试过程和问题 |

### 3.3 计划外新增记录

如有计划外新增的功能，在 `docs/PROGRESS.md` 底部「计划外新增」表格中记录：

```markdown
| 功能 | 状态 | 新增原因 | 日期 |
|------|------|---------|------|
| xxx | ✅ | 原因说明 | 2026-03-28 |
```

### 3.4 Git 提交

```bash
# 查看变更
git status
git diff

# 添加文件（避免使用 git add -A）
git add packages/backend/src/modules/xxx/
git add packages/frontend/src/views/xxx/

# 提交（格式规范见 04-container-deployment.md）
git commit -m "feat: xxx 功能实现

- 后端：XxxModule 完整 CRUD
- 前端：XxxView 页面
- 数据库：新增 xxx 表
"
```

---

## 四、模块开发顺序

**每次只针对一个功能模块开发**，开发前明确：

1. **该模块涉及哪些数据表**（查 `docs/DATABASE.md`）
2. **该模块需要哪些接口**（查 `docs/API.md`）
3. **该模块如何与母本对接**（查 `docs/ARCHITECTURE.md`）
4. **该模块的子模块构成**（查 `docs/MODULES_CORE.md` 或 `docs/MODULES_SPECIALTY.md`）

---

## 五、常见错误与避免

| 错误 | 避免方法 |
|------|----------|
| 401 未授权 | 检查 JWT Token 是否正确附加 |
| 403 无权限 | 检查用户角色是否匹配 |
| 404 接口不存在 | 检查路由前缀和路径 |
| 500 内部错误 | 检查数据库连接和 tenantId |
| 数据为空 | 检查 tenantId 是否匹配 |

---

## 六、调试技巧

### 6.1 后端调试

```bash
# 查看后端日志
docker logs panlei-backend -f --tail 50

# 进入容器调试
docker exec -it panlei-backend sh

# 测试接口（需先登录获取 token）
TOKEN="xxx"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/xxx
```

### 6.2 前端调试

1. 打开浏览器开发者工具（F12）
2. 查看 Network 标签页请求
3. 查看 Console 错误信息
4. 使用 Vue Devtools 检查组件状态

---

## 七、开发完成后的标准流程

```
1. 自测通过
        ↓
2. 更新 docs/PROGRESS.md
        ↓
3. 更新 docs/DATABASE.md（如有）
        ↓
4. 更新 docs/API.md（如有）
        ↓
5. 记录调试日志到 memory
        ↓
6. Git 提交
        ↓
7. 提醒用户确认提交
```

---

## 八、⚠️ 强制执行规则

> 本章节列出所有开发过程中**必须严格执行**的规则。**每次开发完成后必须逐条检查。**

### 8.0 最高优先级规则

#### 规则 0：分级授权机制 🔴

**核心原则**：一次确认，全程授权，异常暂停，结果汇报

**触发条件**：用户提出任何开发任务

**执行流程**：
- [ ] **步骤 1：提供方案**：提供完整方案或计划
- [ ] **步骤 2：获取授权**：询问"你确认执行此方案吗？"，等待明确回复
- [ ] **步骤 3：自主执行**：获得授权后，在方案范围内自主决策
- [ ] **步骤 4：异常暂停**：遇到方案外问题，立即暂停并汇报
- [ ] **步骤 5：结果汇报**：完成后汇报执行结果

**授权范围（确认后无需再确认）**：
- ✅ 创建/修改/删除文件
- ✅ 编写/修改/重构代码
- ✅ 自测验证
- ✅ 更新文档
- ✅ 清理临时文件

**需要额外确认的操作**：
- ⚠️ 数据库迁移
- ⚠️ Git 提交
- ⚠️ 部署操作
- ⚠️ 删除大量文件

**优先级**：**最高**（此规则优先级高于所有其他规则）

---

### 8.1 规则执行机制

**检查时机**：
- 在说"功能已完成"之前必须检查
- 在提交代码之前必须检查
- 在会话结束之前必须检查

**违规补救**：
1. 立即补充执行未完成的规则
2. 在 `06-session-checklist.md` 中记录违规情况
3. 如果是重复违规，需要在 `08-user-preferences.md` 中添加特别提醒

---

### 8.2 文档更新规则

#### 规则 1：功能完成后必须更新 PROGRESS.md

**触发条件**：任何功能开发完成（包括 Bug 修复、新功能、优化、重构）

**必须动作**：
- [ ] 立即更新 `docs/PROGRESS.md` 中对应功能状态
- [ ] 如果是计划外新增，在「计划外新增」章节记录原因

**示例**：
```markdown
| 功能 | 状态 | 说明 |
|------|------|------|
| 用户管理 CRUD | ✅ | 改为已完成 |
```

**检查方法**：打开 `docs/PROGRESS.md`，搜索功能关键词，确认状态已更新

---

#### 规则 2：新增接口必须更新 API.md

**触发条件**：新增任何后端接口（包括修改接口路径/参数/响应）

**必须动作**：
- [ ] 在 `docs/API.md` 中新增或更新接口文档
- [ ] 记录请求方法、路径、参数、响应格式

**示例**：
```markdown
### GET /api/users

**权限**：TEACHER+

**Query 参数**：
- page: number
- pageSize: number

**响应**：User[]
```

---

#### 规则 3：新增数据表必须更新 DATABASE.md

**触发条件**：新增或修改数据库表结构

**必须动作**：
- [ ] 在 `docs/DATABASE.md` 中新增或更新表文档
- [ ] 记录表名、字段说明、外键关系

**示例**：
```markdown
## User 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| username | String | 用户名 |
```

---

### 8.3 代码质量规则

#### 规则 4：新文件必须有头部注释

**触发条件**：创建任何新文件（.ts/.vue/.js）

**必须动作**：
- [ ] 在文件顶部添加简介注释
- [ ] 包含文件名、说明、权限、对应接口（如适用）

**示例**：
```typescript
/**
 * 文件：user.service.ts
 * 说明：用户管理服务（数据库操作）
 * 权限：TEACHER+
 * 对应接口：GET/POST/PATCH/DELETE /api/users
 */
```

---

#### 规则 5：禁止使用 any 类型

**触发条件**：编写任何 TypeScript 代码

**必须动作**：
- [ ] 使用接口（interface）或类型别名（type）定义数据结构
- [ ] 如暂时无法确定类型，使用 `unknown` 代替 `any`

**违规示例**：
```typescript
const data: any = await fetch() // ❌ 错误
```

**正确示例**：
```typescript
interface UserData { id: string; name: string }
const data = await fetch() as UserData // ✅ 正确
```

---

#### 规则 6：所有查询必须带 tenantId

**触发条件**：编写任何数据库查询（Prisma）

**必须动作**：
- [ ] 所有 findMany/findUnique/update/delete 查询必须包含 `tenantId` 条件
- [ ] `tenantId` 从 JWT Token 中提取（`user.tenantId`）

**违规示例**：
```typescript
await prisma.user.findMany({ where: { username } }) // ❌ 缺少 tenantId
```

**正确示例**：
```typescript
await prisma.user.findMany({ where: { tenantId, username } }) // ✅
```

---

### 8.4 测试验证规则

#### 规则 7：功能完成后必须自测

**触发条件**：任何功能开发完成

**必须动作**：
- [ ] 编写调试脚本或手动测试
- [ ] 确认接口返回正确
- [ ] 确认前端页面正常渲染
- [ ] 确认无控制台错误

**禁止行为**：不要让用户当测试员！

**记录要求**：在 `03-debugging-testing.md` 中记录测试过程和结果

---

#### 规则 8：调试完成后必须清理中间文件

**触发条件**：调试或测试完成后

**必须动作**：
- [ ] 删除一次性测试数据文件（如 `test-questions.txt`）
- [ ] 如调试脚本有保留价值，移入 `tests/manual/`，否则删除
- [ ] 清理 `.tmp/` 目录临时文件

**检查方法**：运行 `ls -la | grep -E "test-|debug-"`

---

### 8.5 模块特定规则

#### 规则 9：AI 功能遇到新问题必须记录

**触发条件**：开发 AI 相关功能时遇到新的问题

**必须动作**：
- [ ] 将问题和解决方案记录到 `05-ai-common-issues.md` 的「常见问题汇总」章节

**示例**：
```markdown
| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Token 超限 | 输入超过上下文长度 | 使用长上下文模型 |
```

---

#### 规则 10：硬件开发必须参考硬件记忆

**触发条件**：开发硬件通信相关功能

**必须动作**：
- [ ] 开发前阅读 `09-hardware-communication.md`
- [ ] 遇到问题先查「常见问题汇总」章节
- [ ] 新发现的问题记录到该文件

---

### 8.6 规则检查清单（每次开发完成后必须执行）

```markdown
## 规则执行检查清单

### 文档更新
- [ ] 规则 1：已更新 PROGRESS.md
- [ ] 规则 2：新增接口已更新 API.md
- [ ] 规则 3：新增数据表已更新 DATABASE.md

### 代码质量
- [ ] 规则 4：新文件有头部注释
- [ ] 规则 5：未使用 any 类型
- [ ] 规则 6：所有查询带 tenantId

### 测试验证
- [ ] 规则 7：已完成自测
- [ ] 规则 8：已清理中间文件

### 模块特定
- [ ] 规则 9：AI 问题已记录（如适用）
- [ ] 规则 10：已参考硬件记忆（如适用）
```

---

### 8.7 规则执行的自我检查

**在每次说"功能已完成"之前，必须问自己：**

1. 我更新 PROGRESS.md 了吗？
2. 我自测了吗？
3. 我清理临时文件了吗？
4. 新文件有注释吗？
5. 有没有使用 any？

**如果任何一项未完成，不能说"已完成"！**

---

## 九、执行结果汇报模板

### 9.1 任务完成汇报

**使用时机**：任务完成后

**模板**：
```markdown
## ✅ 任务完成汇报

### 执行内容
- 完成了什么功能
- 修改了哪些文件

### 关键变更
- 新增：xxx
- 修改：xxx
- 删除：xxx

### 自测结果
- ✅ 接口测试通过
- ✅ 前端页面正常

### 文档更新
- ✅ 已更新 PROGRESS.md
- ✅ 已更新 API.md（如有）

### 后续操作
- 需要用户确认是否提交代码
```

---

### 9.2 异常暂停汇报

**使用时机**：遇到方案外问题

**模板**：
```markdown
## ⚠️ 异常暂停汇报

### 遇到的问题
- 问题描述

### 影响范围
- 影响哪些功能

### 解决方案
- 方案 1：xxx
- 方案 2：xxx

### 请问
你希望采用哪个方案？
```

---

### 9.3 节点进度汇报（可选）

**使用时机**：复杂任务的关键节点

**模板**：
```markdown
## 📍 节点进度汇报

**当前进度**：后端接口开发完成

**已完成**：
- ✅ 创建 XxxController
- ✅ 创建 XxxService
- ✅ 接口自测通过

**下一步**：
- 开发前端页面

**预计时间**：约 30 分钟
```

---
