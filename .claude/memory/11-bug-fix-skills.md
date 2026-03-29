---
version: v1.1
lastUpdated: 2026-03-29
totalSkills: 3
topPriority: 1
project: "Panlei-盼蕾教学考试平台"
---

# Bug 修复技能库

> **使用规则**：每次修复 Bug 前必读，优先匹配 TOP 优先级技能
> **核心原则**：区分通用经验与项目特定经验，避免重复踩坑

---

## 🔥 TOP 优先级技能（出现 2 次以上 / 通用高频）

### [TOP-1] API 响应格式不匹配
**适用范围**：🌐 通用（所有项目）
**技术栈**：HTTP API / JSON / 大模型 API
**触发场景**：第三方 API 返回数据结构变化，代码解析失败
**典型特征**：
- 错误信息：`Cannot read property 'xxx' of undefined` / `格式异常`
- 控制台有数据返回，但代码抛错
- 第三方 API 升级/迁移后首次使用

**解决模式**（3 步）：
1. 打印完整响应：`console.log(JSON.stringify(data, null, 2))`
2. 分析实际结构，检查是否数组/对象/嵌套
3. 更新解析逻辑，优先处理可选链和数组检测

**案例**：
- **2026-03-29** - 火山引擎 Responses API
  - 问题：`data.output.text` 不存在，实际在 `output[].content[0].text`
  - 错误：`AI 响应格式异常`
  - 解决：
    ```typescript
    // ❌ 错误
    if (data.output?.text) { jsonText = data.output.text }

    // ✅ 正确
    if (Array.isArray(data.output)) {
      const messageOutput = data.output.find((item: any) =>
        item.type === 'message' && item.content?.[0]?.text
      )
      jsonText = messageOutput?.content?.[0]?.text
    }
    ```

**命中率**：1 次（持续追踪）
**首次出现**：2026-03-29

---

## 📚 技能库（按日期倒序）

### [SKILL-002] 前端服务未启动（端口无法访问）
**日期**：2026-03-29
**适用范围**：🌐 通用（所有项目）
**技术栈**：Node.js / Vite / 开发服务器
**触发场景**：访问 localhost:端口 无响应
**典型特征**：
- 浏览器显示"无法访问此网站"或"ERR_CONNECTION_REFUSED"
- `netstat -ano | grep <端口>` 无结果
- 但后端服务正常（如 3000 端口有响应）

**诊断步骤**：
```bash
# 1. 检查端口是否监听
netstat -ano | grep <端口号>

# 2. 检查进程是否存在
tasklist | grep -i "node\|vite"

# 3. 测试 HTTP 响应
curl -s -o /dev/null -w "%{http_code}" http://localhost:<端口>/
```

**解决方案**：
```bash
# 启动前端开发服务器
cd <项目目录> && pnpm dev:frontend

# 或检查是否被其他进程占用
netstat -ano | grep <端口>  # 找到 PID
taskkill /PID <PID> /F      # 结束占用进程
```

**适用于**：Vite / Webpack / CRA / Vue CLI 等前端开发服务器
**首次出现**：2026-03-29
**出现次数**：1 次

---

### [SKILL-001] TypeScript 类型推断失败
**日期**：2026-03-29
**适用范围**：🌐 通用（所有项目）
**技术栈**：TypeScript
**触发场景**：变量在条件分支中赋值，TS 无法确定所有路径都被赋值
**典型特征**：
```
error TS2454: Variable 'apiKey' is used before being assigned
```
**根因**：条件分支过多，TS 无法确定所有路径都赋值

**解决方案**：
```typescript
// ❌ 错误
let apiKey: string
if (condition1) apiKey = value1
if (condition2) apiKey = value2
// TS 报错：apiKey 可能未定义

// ✅ 正确
let apiKey: string | undefined
if (condition1) apiKey = value1
else if (condition2) apiKey = value2
// 或使用默认值
if (!apiKey) throw new Error('未配置')
```

**适用范围**：所有 TypeScript 项目
**首次出现**：2026-03-29
**出现次数**：1 次
**优先级**：⭐⭐⭐⭐（高频，建议关注）

---

## 📋 待分类技能

> 修复后待分类的技能记录

---

## 版本历史

| 版本 | 日期 | 技能数 | TOP数 | 进化说明 |
|------|------|--------|-------|---------|
| v1.0 | 2026-03-29 | 2 | 1 | 初始建立，区分通用/项目特定 |
| v1.1 | 2026-03-29 | 3 | 1 | 新增：前端服务未启动诊断 + 解决方案 |

---

## 迁移说明

- **通用技能**：标记 `🌐 通用`，可迁移到其他项目
- **项目特定**：标记 `🎯 项目特定`，仅当前项目有效
- 新项目迁移时执行 `00-migration-prompt.md` 提示词