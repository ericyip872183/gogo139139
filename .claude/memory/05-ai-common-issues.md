# AI 模块通用规范

> 本文档记录 AI 模块的常见问题、调试技巧、安全规范。**开发任何 AI 相关功能时必须参考。**

---

## 一、常见问题汇总

> 汇总 AI 功能开发中遇到的常见问题和解决方案

### 1.1 AI 对话问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **Token 超限** | 输入文本超过模型上下文长度 | 1. 使用长上下文模型（如 doubao-pro-32k）<br>2. 分段处理长文本 |
| **流式输出中断** | 网络不稳定或超时 | 1. 增加 timeout 配置<br>2. 实现断点续传 |
| **响应缓慢** | 模型处理时间长或网络延迟 | 1. 使用轻量模型（如 doubao-lite）<br>2. 添加 loading 提示 |
| **中文乱码** | 编码问题 | 确保请求和响应都使用 UTF-8 |
| **内容被截断** | max_tokens 设置过小 | 增大 max_tokens 参数 |

### 1.2 AI 图片生成问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **图片生成失败（400）** | 请求参数格式错误 | 1. 检查必填字段<br>2. 确认模型支持图片生成 |
| **图片质量差** | 参数配置不当 | 1. 调整 quality 参数<br>2. 优化 prompt 描述 |
| **生成速度慢** | 图片生成耗时较长 | 1. 添加进度提示<br>2. 减小图片尺寸 |
| **图片无法下载** | 跨域或链接失效 | 1. 使用后端代理下载<br>2. 保存到本地存储 |

### 1.3 AI 题库导入问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **导入失败** | AI 返回格式不符合预期 | 1. 优化 prompt<br>2. 增加格式验证 |
| **题目重复** | 未去重 | 在导入前去重检查 |
| **选项格式错误** | AI 生成的选项不规范 | 1. 明确选项格式要求<br>2. 后处理修正 |
| **答案不匹配** | AI 理解错误 | 1. 提供示例<br>2. 人工复核 |

### 1.4 虚拟病人问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **对话偏离主题** | 患者角色设定不够明确 | 1. 优化 system prompt<br>2. 添加角色约束 |
| **回复不一致** | 缺少上下文记忆 | 1. 保持完整对话历史<br>2. 定期总结关键信息 |
| **回复过于简短** | 未明确回复要求 | 在 prompt 中指定回复长度和详细程度 |

### 1.5 配额与计费问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **429 限流错误** | 请求频率超限 | 1. 实现请求队列<br>2. 指数退避重试 |
| **余额不足** | 账户余额耗尽 | 1. 设置预警阈值<br>2. 自动提醒充值 |
| **成本过高** | 使用了昂贵的模型 | 1. 根据场景选择合适模型<br>2. 优化 prompt 减少消耗 |

### 1.6 文件上传问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **文件上传失败** | 文件大小超限 | 检查文件大小限制（图片≤5MB，文档≤50MB） |
| **file_id 无效** | 文件状态不是 active | 等待 status=active 再调用 |
| **字段类型错误** | input_image/input_file 混用 | 图片用 input_image，文档用 input_file |
| **Word 格式不支持** | 使用了 .doc 格式 | 转换为 .docx 格式 |

---

## 二、调试技巧

### 2.1 如何查看完整请求和响应

```javascript
// 后端添加日志
console.log('请求:', JSON.stringify(requestBody, null, 2))
console.log('响应:', JSON.stringify(response, null, 2))
```

### 2.2 如何测试流式输出

```bash
# 使用 curl 测试流式输出
curl -N -X POST https://api.xxx.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"xxx","messages":[{"role":"user","content":"你好"}],"stream":true}'
```

### 2.3 如何估算 Token 消耗

```typescript
// 粗略估算（中文）
const estimatedTokens = text.length / 2

// 精确计算需要使用 tokenizer
```

### 2.4 如何调试 AI 对话

```javascript
// test-ai-chat.js
const axios = require('axios')

async function testChat() {
  const response = await axios.post('http://localhost:3002/api/ai/chat', {
    messages: [{ role: 'user', content: '你好' }],
    model: 'doubao-lite-4k'
  }, {
    headers: { Authorization: 'Bearer YOUR_TOKEN' }
  })

  console.log('响应:', response.data)
}

testChat()
```

---

## 三、安全规范

### 3.1 API Key 管理

| 规则 | 说明 |
|------|------|
| ✅ 必须加密存储 | 数据库中使用 AES 加密 |
| ✅ 不得在前端代码中暴露 | 所有 API 调用必须通过后端代理 |
| ✅ 实现请求频率限制 | 防止恶意调用和超额消费 |
| ✅ 实现权限控制 | 根据角色限制 AI 功能访问 |

### 3.2 错误重试机制

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      if (error.status === 429) {
        // 限流，指数退避
        const delay = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      } else if (error.status >= 500) {
        // 服务器错误，重试
        const delay = Math.pow(2, i) * 500
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // 其他错误，直接抛出
        throw error
      }
    }
  }

  throw lastError || new Error('API 调用失败')
}
```

### 3.3 成本核算

```typescript
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,  // 每千 tokens 价格
  outputPrice: number
): number {
  return (inputTokens / 1000) * inputPrice +
         (outputTokens / 1000) * outputPrice
}

// 示例：豆包 Pro 4K
// 输入：¥0.0008/千tokens
// 输出：¥0.002/千tokens
const cost = calculateCost(1000, 500, 0.0008, 0.002)
console.log('成本:', cost, '元')
```

### 3.4 请求频率限制

```typescript
// 简单的内存限流器
class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  async checkLimit(userId: string, maxRequests: number, windowMs: number) {
    const now = Date.now()
    const windowStart = now - windowMs

    // 获取用户请求历史
    let userRequests = this.requests.get(userId) || []

    // 过滤掉过期的请求
    userRequests = userRequests.filter(time => time > windowStart)

    // 检查是否超限
    if (userRequests.length >= maxRequests) {
      throw new Error('请求频率超限，请稍后再试')
    }

    // 记录本次请求
    userRequests.push(now)
    this.requests.set(userId, userRequests)
  }
}
```

---

## 四、对接新大模型流程

### 4.1 信息收集

- [ ] 获取 API 文档链接
- [ ] 获取 API Key
- [ ] 了解模型矩阵
- [ ] 了解价格结构
- [ ] 了解限流政策

### 4.2 文档创建

在 `.claude/memory/` 目录下创建 `05{字母}-{模型名}-integration.md`：

```markdown
# {大模型名称} 对接文档

## 1. 基础信息
...

## 2. 模型矩阵
...

## 3. 请求格式
...
```

### 4.3 后端实现

- [ ] 创建 Provider Service
- [ ] 实现 chat 方法
- [ ] 处理响应解析
- [ ] 实现错误处理

### 4.4 前端实现

- [ ] 创建配置页面
- [ ] 实现测试功能

### 4.5 测试验证

- [ ] 编写测试脚本
- [ ] 测试基础对话
- [ ] 测试特殊功能
- [ ] 记录测试结果

### 4.6 文档更新

- [ ] 更新 `docs/API.md`
- [ ] 更新 `docs/PROGRESS.md`
- [ ] 在本文件新增「对接日志」

---

## 五、已对接大模型列表

| 大模型 | 对接状态 | 文档位置 |
|--------|----------|----------|
| 豆包（火山引擎） | ✅ 已对接 | `05a-doubao-integration.md` |

---

## 六、对接日志

> 记录每次大模型对接的过程和结果

---

### 2026-03-28 - AI 模块通用规范建立

**工作内容**：
- 从 `05-api-integration-template.md` 拆分出通用规范
- 整理 AI 功能常见问题汇总
- 建立安全规范和调试技巧

**创建的文件**：
1. 05-ai-common-issues.md - AI 模块通用规范

**最终状态**：✅ 完成

---

### （待更新）

> 此处记录后续大模型对接的日志
