# Bug修复经验

## 火山引擎 Responses API 响应解析错误

**触发场景**：调用 Responses API 后解析响应数据报错

**错误信息**：`AI 响应格式异常` / `Cannot read property 'text' of undefined`

**根因**：Responses API 的 output 是数组，不是直接的 text 字段

```typescript
// ❌ 错误写法
const text = data.output?.text

// ✅ 正确写法
if (Array.isArray(data.output)) {
  const messageOutput = data.output.find((item: any) =>
    item.type === 'message' && item.content?.[0]?.text
  )
  const text = messageOutput?.content?.[0]?.text
}
```

---

## TypeScript 变量未赋值错误

**触发场景**：条件分支中赋值，TS 报 `Variable used before being assigned`

**根因**：多个 if 分支，TS 无法确定所有路径都赋值

```typescript
// ❌ 错误
let apiKey: string
if (condition1) apiKey = value1
if (condition2) apiKey = value2
// TS报错：apiKey 可能未定义

// ✅ 正确
let apiKey: string | undefined
if (condition1) apiKey = value1
else if (condition2) apiKey = value2
if (!apiKey) throw new Error('未配置')
```

---

## 前端服务未启动（端口无法访问）

**触发场景**：访问 localhost:5173 显示"无法访问此网站"

**诊断**：
```bash
netstat -ano | grep 5173   # 检查端口是否监听
```

**解决**：手动启动前端开发服务器 `pnpm dev:frontend`

---

> 发现新Bug后在此追加记录，格式：标题 + 触发场景 + 错误信息 + 根因 + 解决方案
