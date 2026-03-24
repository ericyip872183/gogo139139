# 大模型 API 对接完全指南

> 版本：v1.0
> 最后更新：2026-03-24
> 适用对象：开发者、AI 助手
>
> **目标**：仅通过此文档即可适配任何主流大模型 API

---

## 第一部分：快速上手

### 1.1 统一调用接口

```typescript
// 标准消息格式
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ImageContent[]
}

interface ImageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'low' | 'high' }
}

// 标准响应格式
interface ChatResponse {
  id: string
  content: string
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter'
}

// 统一配置
interface LLMConfig {
  provider: 'volcano' | 'baidu' | 'ali' | 'tencent' | 'xunfei' | 'zhipu' | 'minimax' | 'moonshot' | 'openai'
  apiKey: string
  secretKey?: string  // 百度/腾讯需要
  model?: string
  baseUrl?: string
}
```

### 1.2 模型选择速查表

#### 按场景推荐

| 场景 | 首选 | 备选 | 理由 |
|------|------|------|------|
| 中文对话 | 文心一言 | 豆包 Pro | 中文理解最好 |
| 代码生成 | GPT-4o | Qwen-Max | 代码能力最强 |
| 长文档分析 | Kimi Max | GLM-Ultra | 上下文最大 |
| 图片理解 | GPT-4o | Qwen-VL | 多模态最强 |
| 低成本 | ERNIE Speed | Spark Lite | 免费使用 |
| 批量处理 | Doubao Lite | HunYuan Lite | 性价比最高 |

#### 价格对比（每千 tokens）

| 平台 | 入门 | 通用 | 高端 |
|------|------|------|------|
| 百度 | 免费 | ¥0.0008 | ¥0.003 |
| 讯飞 | 免费 | ¥0.002 | ¥0.008 |
| 火山 | ¥0.0003 | ¥0.0008 | ¥0.005 |
| 腾讯 | ¥0.00025 | ¥0.0008 | ¥0.003 |
| 阿里 | ¥0.0006 | ¥0.0015 | ¥0.012 |
| 智谱 | ¥0.0005 | ¥0.0015 | ¥0.02 |
| OpenAI | ¥0.001 | ¥0.018 | ¥0.21 |

---

## 第二部分：各平台详细对接

### 2.1 火山引擎（豆包大模型）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://www.volcengine.com/ |
| 控制台 | https://console.volcengine.com/ark |
| 文档 | https://www.volcengine.com/docs/ark |
| 基础端点 | `https://ark.cn-beijing.volces.com/api/v3` |
| 鉴权 | Bearer Token（API Key） |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| Doubao Lite | `doubao-lite-4k` | 4K | ¥0.0003 | ¥0.0006 | 对话 |
| Doubao Pro | `doubao-pro-4k` | 4K | ¥0.0008 | ¥0.002 | 对话/推理 |
| Doubao Pro | `doubao-pro-32k` | 32K | ¥0.0008 | ¥0.002 | 长文档 |
| Doubao Pro | `doubao-pro-128k` | 128K | ¥0.005 | ¥0.013 | 超长文本 |
| Doubao Vision | `doubao-vision-pro-32k` | 32K | ¥0.0008 | ¥0.002 | 图片理解 |

#### Token 计算规则

```
文本：
- 中文：1 token ≈ 1.5 个汉字
- 英文：1 token ≈ 0.75 个单词（约 4 个字符）
- 标点符号：1 个标点 ≈ 0.5 token

图片（Vision 模型）：
- 每张图片固定计费：约 170 tokens（与分辨率无关）
- 或按像素计算：每 512×512 像素 = 85 tokens

示例：
- 100 汉字 = 67 tokens
- 100 英文单词 = 133 tokens
- 1 张图片 = 170 tokens
```

#### 请求格式

**标准对话请求**：
```json
{
  "model": "doubao-pro-4k",
  "messages": [
    {"role": "system", "content": "你是一个有用的助手"},
    {"role": "user", "content": "你好"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

**图片理解请求**：
```json
{
  "model": "doubao-vision-pro-32k",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "请描述这张图片"},
        {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
      ]
    }
  ]
}
```

#### 响应格式

```json
{
  "id": "chat-20240324123456",
  "object": "chat.completion",
  "created": 1711272000,
  "model": "doubao-pro-4k",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！有什么我可以帮助你的吗？"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

#### 模型切换

```typescript
// 仅需修改 model 字段
const config = {
  model: 'doubao-pro-4k',      // 通用对话
  // model: 'doubao-lite-4k',  // 低成本
  // model: 'doubao-pro-32k',  // 长文档
  // model: 'doubao-vision-pro-32k',  // 图片理解
}
```

#### 错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查 JSON 格式和必填字段 |
| 401 | 认证失败 | 检查 API Key 是否正确 |
| 403 | 权限不足 | 检查账户余额/权限 |
| 429 | 请求超限 | 降低频率或升级配额 |
| 500 | 服务器错误 | 稍后重试 |
| 503 | 服务不可用 | 检查服务状态 |

#### 提示词示例

**角色设定**：
```
你是一个专业的中医教学助手，请用专业但易懂的语言回答学生问题。
回答时要引用经典文献，如《黄帝内经》《伤寒论》等。
```

**结构化输出**：
```
请按以下 JSON 格式输出：
{
  "answer": "答案内容",
  "explanation": "详细解析",
  "knowledge_points": ["知识点 1", "知识点 2"]
}
```

**Few-Shot 示例**：
```
示例 1：
用户：望诊中，面色苍白主什么证？
助手：【答案】虚证、寒证、失血证
     【解析】面色苍白多因气血不足...

示例 2：
用户：舌苔厚腻表示什么？
助手：【答案】湿浊内蕴
     【解析】舌苔厚腻是湿邪的典型表现...

请按照上述格式回答：
用户：脉滑主什么病？
```

---

### 2.2 百度智能云（文心一言）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://cloud.baidu.com/product/wenxinworkshop |
| 控制台 | https://console.bce.baidu.com/qianfan |
| 文档 | https://cloud.baidu.com/doc/WENXINWORKSHOP |
| 基础端点 | `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop` |
| 鉴权 | OAuth 2.0（AK/SK 换 access_token） |

#### 模型矩阵

| 模型 | Endpoint | 上下文 | 输入 | 输出 | 能力 |
|------|----------|--------|------|------|------|
| ERNIE Speed | `ernie-speed-128k` | 128K | 免费 | 免费 | 轻量 |
| ERNIE Speed | `ernie-speed-8k` | 8K | 免费 | 免费 | 免费 |
| ERNIE Lite | `ernie-lite-8k` | 8K | ¥0.0002 | ¥0.0004 | 基础 |
| ERNIE Tiny | `ernie-tiny-8k` | 8K | ¥0.00003 | ¥0.00006 | 超低成本 |
| ERNIE 4.0 | `ernie-4.0-8k` | 8K | ¥0.003 | ¥0.009 | 高端 |
| ERNIE 3.5 | `ernie-3.5-8k` | 8K | ¥0.0008 | ¥0.002 | 通用 |
| ERNIE Bot-Turbo | `eb-instant` | 8K | ¥0.001 | ¥0.003 | 快速 |

#### Token 计算规则

```
文本：
- 中文：1 token = 1 个汉字（含标点）
- 英文：1 token ≈ 1 个单词（按空格分词）
- 混合文本：汉字按 1:1，英文按空格分词

图片（VL 模型）：
- 每张图片 = 256 tokens（固定）
- 或按分辨率阶梯计费

示例：
- "你好世界" = 4 tokens
- "Hello World" = 2 tokens
- "你好 Hello" = 3 tokens
```

#### 鉴权方式

```typescript
// 第一步：用 AK/SK 换取 access_token
async function getAccessToken(apiKey: string, secretKey: string): Promise<string> {
  const response = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  )
  const data = await response.json()
  return data.access_token
}

// 第二步：使用 access_token 调用 API
const token = await getAccessToken('your-ak', 'your-sk')
```

#### 请求格式

**标准请求**：
```json
POST /rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=YOUR_TOKEN

{
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "temperature": 0.7,
  "max_output_tokens": 1024
}
```

**百度特殊格式**：
- 不支持 system 角色的模型需用 `system` 字段单独传
- 部分老模型使用 `chat` 而非 `chat/completions`

#### 响应格式

```json
{
  "id": "as-xxxxxxxx",
  "object": "chat.completion",
  "created": 1711272000,
  "result": "你好！有什么可以帮助你的？",
  "is_truncated": false,
  "need_clear_history": false,
  "usage": {
    "prompt_tokens": 2,
    "completion_tokens": 10,
    "total_tokens": 12
  }
}
```

**注意**：百度返回的 content 在 `result` 字段，而非 `choices[0].message.content`

#### 模型切换

```typescript
// 修改 endpoint 参数
const endpoints = {
  speed: 'ernie-speed-128k',
  lite: 'ernie-lite-8k',
  turbo: 'eb-instant',
  '3.5': 'ernie-3.5-8k',
  '4.0': 'ernie-4.0-8k',
}
```

#### 错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求格式 |
| 401 | 认证失败 | 重新获取 access_token |
| 403 | 权限不足 | 检查配额/余额 |
| 429 | QPS 超限 | 降低频率 |
| 500 | 服务内部错误 | 重试 |

#### 提示词示例

**百度的 system 字段用法**：
```json
{
  "system": "你是一名医学专家，请用专业术语回答。",
  "messages": [
    {"role": "user", "content": "感冒怎么办？"}
  ]
}
```

**结构化输出指令**：
```
请用 JSON 格式回答，包含以下字段：
- diagnosis: 诊断结果
- symptoms: 症状列表
- treatment: 治疗建议
```

---

### 2.3 阿里云（通义千问）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://tongyi.aliyun.com/ |
| 控制台 | https://dashscope.console.aliyun.com/ |
| 文档 | https://help.aliyun.com/zh/dashscope |
| 基础端点 | `https://dashscope.aliyuncs.com/api/v1` |
| 鉴权 | Bearer Token（API Key） |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| Qwen Turbo | `qwen-turbo` | 8K | ¥0.0006 | ¥0.0012 | 轻量 |
| Qwen Plus | `qwen-plus` | 32K | ¥0.0015 | ¥0.004 | 通用 |
| Qwen Max | `qwen-max` | 32K | ¥0.012 | ¥0.036 | 高端 |
| Qwen Max | `qwen-max-longcontext` | 200K | ¥0.012 | ¥0.036 | 超长文 |
| Qwen VL | `qwen-vl-max` | 8K | ¥0.005 | ¥0.015 | 图片 |
| Qwen Audio | `qwen-audio-max` | 8K | ¥0.008 | ¥0.024 | 音频 |

#### Token 计算规则

```
文本：
- 中文：1 token ≈ 1.5 个汉字
- 英文：1 token ≈ 1 个单词
- 代码：按实际字符计算

图片（Qwen-VL）：
- 每张图片 = 256 tokens（固定）
- 多张图片累加

视频（Qwen-VL）：
- 按帧抽取，每秒 1 帧
- 每帧 = 256 tokens

示例：
- "你好世界" = 3 tokens
- "Hello World" = 3 tokens
```

#### 请求格式

**标准请求**：
```json
POST /api/v1/services/aigc/text-generation/generation

Headers: Authorization: Bearer YOUR_API_KEY

{
  "model": "qwen-plus",
  "input": {
    "messages": [
      {"role": "system", "content": "你是助手"},
      {"role": "user", "content": "你好"}
    ]
  },
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 1024
  }
}
```

**图片请求**：
```json
{
  "model": "qwen-vl-max",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [
          {"image": "https://example.com/image.jpg"},
          {"text": "请描述这张图片"}
        ]
      }
    ]
  }
}
```

#### 响应格式

```json
{
  "request_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20,
    "total_tokens": 30
  },
  "output": {
    "text": "你好！有什么可以帮助你的？",
    "finish_reason": "stop",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "你好！有什么可以帮助你的？"
        },
        "finish_reason": "stop"
      }
    ]
  }
}
```

**注意**：阿里返回格式独特，content 在 `output.text` 和 `output.choices[0].message.content`

#### 模型切换

```typescript
const models = {
  turbo: 'qwen-turbo',
  plus: 'qwen-plus',
  max: 'qwen-max',
  vl: 'qwen-vl-max',
  audio: 'qwen-audio-max',
}
```

#### 错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| InvalidParameter | 参数错误 | 检查格式 |
| InvalidApiKey | Key 无效 | 检查 API Key |
| QuotaExceeded | 配额超限 | 升级套餐 |
| Throttled | 限流 | 降低频率 |

#### 提示词示例

**工具调用格式**：
```
你是一个智能助手，可以使用以下工具：
- search(query): 搜索信息
- calculate(expression): 计算数学表达式

用户问：北京今天天气怎么样？
你应该：search("北京今天天气")
```

---

### 2.4 腾讯（混元大模型）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://hunyuan.tencent.com/ |
| 控制台 | https://console.cloud.tencent.com/hunyuan |
| 文档 | https://cloud.tencent.com/document/product/1729 |
| 基础端点 | `https://hunyuan.tencentcloudapi.com` |
| 鉴权 | TC3-HMAC-SHA256 签名 |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| HunYuan Lite | `hunyuan-lite` | 28K | ¥0.00025 | ¥0.0005 | 轻量 |
| HunYuan Standard | `hunyuan-standard` | 32K | ¥0.0008 | ¥0.002 | 通用 |
| HunYuan Pro | `hunyuan-pro` | 32K | ¥0.003 | ¥0.009 | 专业 |
| HunYuan Max | `hunyuan-max` | 32K | ¥0.005 | ¥0.015 | 高端 |

#### Token 计算规则

```
文本：
- 中文：1 token ≈ 1 个汉字
- 英文：1 token ≈ 1 个单词

图片（HunYuan Vision）：
- 按分辨率阶梯计费
- 512×512 以下 = 85 tokens
- 512×512 以上 = 170 tokens
```

#### 鉴权方式（腾讯特有）

```typescript
// 腾讯使用复杂的签名鉴权
async function getTencentSignature(
  secretId: string,
  secretKey: string,
  action: string,
  payload: string
): Promise<{ headers: Record<string, string> }> {
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]

  // 签名过程省略，建议使用官方 SDK
  return {
    headers: {
      'Authorization': `TC3-HMAC-SHA256 Credential=${secretId}/...`,
      'X-TC-Action': action,
      'X-TC-Version': '2023-09-01',
      'X-TC-Timestamp': timestamp.toString(),
    }
  }
}
```

#### 请求格式

```json
POST https://hunyuan.tencentcloudapi.com

{
  "Model": "hunyuan-standard",
  "Messages": [
    {"Role": "user", "Content": "你好"}
  ],
  "Temperature": 0.7
}
```

#### 响应格式

```json
{
  "Response": {
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "Choices": [
      {
        "Message": {
          "Role": "assistant",
          "Content": "你好！"
        },
        "FinishReason": "stop"
      }
    ],
    "Usage": {
      "PromptTokens": 2,
      "CompletionTokens": 10,
      "TotalTokens": 12
    }
  }
}
```

**注意**：腾讯返回使用大驼峰命名（`Choices`、`Message`、`Content`）

---

### 2.5 讯飞（星火大模型）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://www.xfyun.cn/ |
| 控制台 | https://console.xfyun.cn/ |
| 文档 | https://www.xfyun.cn/doc/spark/Web.html |
| 基础端点 | `https://spark-api-open.xf-yun.com` |
| 鉴权 | JWT Token |

#### 模型矩阵

| 模型 | 版本 | 模型 ID | 上下文 | 输入 | 输出 |
|------|------|--------|--------|------|------|
| Spark Lite | V1.5 | `general` | 4K | 免费 | 免费 |
| Spark Pro | V3.0 | `generalv3` | 8K | ¥0.002 | ¥0.006 |
| Spark Max | V3.5 | `generalv3.5` | 8K | ¥0.004 | ¥0.012 |
| Spark 4.0 | V4.0 | `4.0Ultra` | 8K | ¥0.008 | ¥0.024 |

#### Token 计算规则

```
文本：
- 按字符数计算
- 中文：1 汉字 = 1 token
- 英文：1 单词 = 1 token
```

#### 请求格式

```json
POST /v1/chat/completions

{
  "model": "generalv3.5",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

#### 响应格式

```json
{
  "id": "xxxxxxxx",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "你好！"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 2,
    "completion_tokens": 10,
    "total_tokens": 12
  }
}
```

---

### 2.6 智谱 AI（GLM）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://www.zhipuai.cn/ |
| 控制台 | https://open.bigmodel.cn/ |
| 文档 | https://open.bigmodel.cn/dev/api |
| 基础端点 | `https://open.bigmodel.cn/api/paas/v4` |
| 鉴权 | Bearer Token（API Key） |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| GLM Edge | `glm-edge` | 128K | ¥0.0005 | ¥0.001 | 轻量 |
| GLM Edge Pro | `glm-edge-pro` | 128K | ¥0.0015 | ¥0.004 | 通用 |
| GLM Plus | `glm-plus` | 128K | ¥0.005 | ¥0.015 | 专业 |
| GLM Ultra | `glm-ultra` | 256K | ¥0.02 | ¥0.06 | 高端 |
| CogView | `cogview-3` | 4K | ¥0.01/张 | - | 图片生成 |

#### Token 计算规则

```
文本：
- 中文：1 token ≈ 1 个汉字
- 英文：1 token ≈ 1 个单词

图片（CogView）：
- 按生成图片数量计费
- 512×512 = 1 张
```

#### 请求格式

```json
POST /chat/completions

{
  "model": "glm-plus",
  "messages": [
    {"role": "system", "content": "你是助手"},
    {"role": "user", "content": "你好"}
  ]
}
```

#### 响应格式

```json
{
  "id": "xxxxxxxx",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

---

### 2.7 MiniMax

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://www.minimaxi.com/ |
| 控制台 | https://platform.minimaxi.com/ |
| 文档 | https://platform.minimaxi.com/document |
| 基础端点 | `https://api.minimax.chat/v1` |
| 鉴权 | Bearer Token |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| ABAB 6.5 | `abab6.5-chat` | 256K | ¥0.003 | ¥0.012 | 通用 |
| ABAB 6.5s | `abab6.5s-chat` | 256K | ¥0.001 | ¥0.004 | 轻量 |
| ABAB 5.5 | `abab5.5-chat` | 16K | ¥0.002 | ¥0.008 | 基础 |

#### Token 计算规则

```
- 中文：1 token ≈ 1 个汉字
- 英文：1 token ≈ 1 个单词
```

#### 请求格式

```json
POST /text/chatcompletion_v2

{
  "model": "abab6.5-chat",
  "messages": [
    {"role": "system", "content": "你是助手"},
    {"role": "user", "content": "你好"}
  ]
}
```

---

### 2.8 月之暗面（Kimi）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://www.moonshot.cn/ |
| 控制台 | https://platform.moonshot.cn/ |
| 文档 | https://platform.moonshot.cn/docs |
| 基础端点 | `https://api.moonshot.cn/v1` |
| 鉴权 | Bearer Token |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| Kimi 8K | `moonshot-v1-8k` | 8K | ¥0.002 | ¥0.006 | 轻量 |
| Kimi 32K | `moonshot-v1-32k` | 32K | ¥0.008 | ¥0.024 | 通用 |
| Kimi 128K | `moonshot-v1-128k` | 128K | ¥0.02 | ¥0.06 | 长文档 |

#### Token 计算规则

```
文本：
- 中文：1 token ≈ 1 个汉字
- 英文：1 token ≈ 1 个单词

文件：
- PDF/Word/Excel 按实际文本内容计算
- 每页约 300-500 tokens
```

#### 请求格式

```json
POST /chat/completions

{
  "model": "moonshot-v1-32k",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

#### 特色功能：文件上传

```json
{
  "model": "moonshot-v1-128k",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "请总结这个文件"},
        {"type": "file", "file": {"url": "https://example.com/doc.pdf"}}
      ]
    }
  ]
}
```

---

### 2.9 OpenAI（GPT）

#### 基础信息

| 项目 | 值 |
|------|-----|
| 官网 | https://openai.com/ |
| 控制台 | https://platform.openai.com/ |
| 文档 | https://platform.openai.com/docs |
| 基础端点 | `https://api.openai.com/v1` |
| 鉴权 | Bearer Token |

#### 模型矩阵

| 模型 | ID | 上下文 | 输入 | 输出 | 能力 |
|------|-----|--------|------|------|------|
| GPT-4o mini | `gpt-4o-mini` | 128K | $0.00015 | $0.0006 | 轻量 |
| GPT-4o | `gpt-4o` | 128K | $0.0025 | $0.01 | 通用 |
| GPT-4 Turbo | `gpt-4-turbo` | 128K | $0.01 | $0.03 | 高端 |
| o1 | `o1` | 200K | $0.015 | $0.06 | 推理 |

#### Token 计算规则

```
文本：
- 中文：1 token ≈ 1.5 个汉字
- 英文：1 token ≈ 0.75 个单词（约 4 字符）

图片（GPT-4o/Vision）：
- 低分辨率（512×512）：85 tokens/张
- 高分辨率（2048×2048）：170 tokens/张
- auto：自动选择

视频（GPT-4o）：
- 按帧抽取处理
- 每秒约 1-2 帧
```

#### 请求格式（标准）

```json
POST /chat/completions

{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "你是助手"},
    {"role": "user", "content": "你好"}
  ]
}
```

#### 图片请求格式

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "这是什么？"},
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg",
            "detail": "high"
          }
        }
      ]
    }
  ]
}
```

#### 响应格式（标准）

```json
{
  "id": "chatcmpl-xxxxxxxx",
  "object": "chat.completion",
  "created": 1711272000,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

---

## 第三部分：提示词工程指南

### 3.1 基础原则

#### 1. 清晰明确

❌ 模糊：
```
帮我写点东西
```

✅ 明确：
```
请写一篇 300 字的中医科普文章，介绍"望闻问切"四诊的基本概念。
```

#### 2. 角色设定

```
你是一名有 20 年经验的中医教授，正在给大一新生讲解基础知识。
请用通俗易懂的语言，配合生活实例进行说明。
```

#### 3. 分步指令

```
请按以下步骤完成任务：
1. 先分析题目涉及的知识点
2. 给出标准答案
3. 提供详细解析
4. 列举相关考点
```

### 3.2 高级技巧

#### Chain of Thought（思维链）

```
请逐步推理：
1. 首先，分析题目要求...
2. 然后，回顾相关知识...
3. 接着，进行逻辑推导...
4. 最后，得出结论...
```

#### Few-Shot Prompting（少样本学习）

```
示例 1：
输入：面色苍白
输出：主虚证、寒证、失血证

示例 2：
输入：舌红少苔
输出：主阴虚火旺

示例 3：
输入：脉滑
输出：
```

#### ReAct（推理 + 行动）

```
你可以使用以下工具：
- search(query): 搜索信息
- calculate(expr): 计算

问题：北京到上海的距离乘以 2 是多少？
思考：我需要先查询北京到上海的距离
行动：search("北京到上海距离")
观察：约 1200 公里
思考：现在计算 1200×2
行动：calculate("1200*2")
观察：2400
回答：北京到上海的距离乘以 2 是 2400 公里。
```

### 3.3 场景化示例库

#### 对话助手

```
你是一名友好的中医学习助手，名字叫"小岐黄"。
- 用亲切、鼓励的语气交流
- 遇到专业术语要解释
- 适当引用经典文献
- 不确定时诚实承认

用户：什么是"八纲辨证"？
```

#### 代码生成

```
请用 TypeScript 实现一个函数，要求：
1. 函数名：parseQuestions
2. 输入：JSON 字符串（题目列表）
3. 输出：数组，每题含 id、type、content、options、answer
4. 处理可能的格式错误

请附上使用示例和错误处理说明。
```

#### 文档总结

```
请总结以下文章的核心观点：
- 用 3-5 个要点概括
- 每点不超过 50 字
- 标注重要程度（★★★表示最重要）

[文章内容]
```

#### 数据提取

```
请从以下文本中提取信息，输出 JSON 格式：
{
  "patient_name": "患者姓名",
  "symptoms": ["症状 1", "症状 2"],
  "diagnosis": "诊断",
  "treatment": "治疗方案"
}

文本：[病历内容]
```

#### 图片理解

```
请分析这张医学图片：
1. 识别图片类型（舌象/脉象/穴位图等）
2. 描述主要特征
3. 判断可能的证型
4. 给出诊断建议

[图片]
```

#### 多步任务

```
任务：创建一份中医诊断学测试卷

步骤：
1. 确定考察范围（望闻问切、八纲辨证、脏腑辨证）
2. 生成 10 道单选题（每题 4 选项）
3. 生成 5 道多选题（每题 4 选项，至少 2 个正确答案）
4. 生成 5 道判断题
5. 提供标准答案和解析

难度：中等（适合大二学生）
```

### 3.4 各平台提示词差异

| 平台 | System 角色 | Few-Shot | 特殊说明 |
|------|------------|----------|----------|
| 火山引擎 | ✅ 支持 | ✅ | 标准格式 |
| 百度 | ⚠️ 部分支持 | ✅ | 老模型用 system 字段 |
| 阿里 | ✅ 支持 | ✅ | 支持工具调用 |
| 腾讯 | ✅ 支持 | ✅ | 标准格式 |
| 讯飞 | ✅ 支持 | ✅ | 需指定版本 |
| 智谱 | ✅ 支持 | ✅ | 支持超长上下文 |
| MiniMax | ✅ 支持 | ✅ | 创意能力强 |
| Kimi | ✅ 支持 | ✅ | 适合长文档 |
| OpenAI | ✅ 支持 | ✅ | 最成熟 |

### 3.5 参数建议

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| temperature | 创造性（0-2） | 对话 0.7，代码 0.2，创意 1.0 |
| top_p | 核采样 | 0.9-1.0 |
| max_tokens | 最大输出 | 根据需求，一般 1024-4096 |
| presence_penalty | 新颖性 | 0-0.5 |

---

## 第四部分：统一封装层实现

### 4.1 核心接口定义

```typescript
// 统一消息格式
interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | UnifiedContent[]
}

interface UnifiedContent {
  type: 'text' | 'image' | 'file'
  text?: string
  imageUrl?: string
  fileUrl?: string
}

// 统一响应格式
interface UnifiedResponse {
  id: string
  content: string
  model: string
  usage: TokenUsage
  finishReason: string
  raw?: any  // 原始响应
}

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// 提供者接口
interface LLMProvider {
  name: string
  chat(messages: UnifiedMessage[], options?: ChatOptions): Promise<UnifiedResponse>
  getModels(): Promise<ModelInfo[]>
}

interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  inputPrice: number
  outputPrice: number
}
```

### 4.2 火山引擎适配器

```typescript
class VolcanoProvider implements LLMProvider {
  name = 'volcano'
  private baseUrl = 'https://ark.cn-beijing.volces.com/api/v3'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(messages: UnifiedMessage[], options?: ChatOptions): Promise<UnifiedResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || 'doubao-pro-4k',
        messages: this.convertMessages(messages),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1024,
      }),
    })

    const data = await response.json()

    return {
      id: data.id,
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: data.choices[0].finish_reason,
      raw: data,
    }
  }

  private convertMessages(messages: UnifiedMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string'
        ? msg.content
        : msg.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text }
            if (c.type === 'image') return { type: 'image_url', image_url: { url: c.imageUrl } }
            return c
          }),
    }))
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      { id: 'doubao-lite-4k', name: 'Doubao Lite', contextWindow: 4096, inputPrice: 0.0003, outputPrice: 0.0006 },
      { id: 'doubao-pro-4k', name: 'Doubao Pro', contextWindow: 4096, inputPrice: 0.0008, outputPrice: 0.002 },
      { id: 'doubao-pro-32k', name: 'Doubao Pro 32K', contextWindow: 32768, inputPrice: 0.0008, outputPrice: 0.002 },
      { id: 'doubao-pro-128k', name: 'Doubao Pro 128K', contextWindow: 131072, inputPrice: 0.005, outputPrice: 0.013 },
    ]
  }
}
```

### 4.3 百度适配器

```typescript
class BaiduProvider implements LLMProvider {
  name = 'baidu'
  private baseUrl = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop'
  private accessToken: string

  constructor(apiKey: string, secretKey: string) {
    this.accessToken = ''
    this.initToken(apiKey, secretKey)
  }

  private async initToken(apiKey: string, secretKey: string) {
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    )
    const data = await response.json()
    this.accessToken = data.access_token
  }

  async chat(messages: UnifiedMessage[], options?: ChatOptions): Promise<UnifiedResponse> {
    const endpoint = this.getModelEndpoint(options?.model)
    const response = await fetch(
      `${this.baseUrl}/chat/${endpoint}?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: options?.temperature || 0.7,
          max_output_tokens: options?.maxTokens || 1024,
        }),
      }
    )

    const data = await response.json()

    // 百度返回格式独特
    return {
      id: data.id,
      content: data.result,  // 注意：百度返回 result 而非 choices[0].message.content
      model: options?.model || 'ernie-3.5-8k',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.finish_reason || 'stop',
      raw: data,
    }
  }

  private getModelEndpoint(model?: string): string {
    const map: Record<string, string> = {
      'ernie-speed-128k': 'ernie-speed-128k',
      'ernie-lite-8k': 'ernie-lite-8k',
      'ernie-3.5-8k': 'ernie-3.5-8k',
      'ernie-4.0-8k': 'ernie-4.0-8k',
    }
    return map[model || 'ernie-3.5-8k'] || 'ernie-3.5-8k'
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      { id: 'ernie-speed-128k', name: 'ERNIE Speed', contextWindow: 131072, inputPrice: 0, outputPrice: 0 },
      { id: 'ernie-lite-8k', name: 'ERNIE Lite', contextWindow: 8192, inputPrice: 0.0002, outputPrice: 0.0004 },
      { id: 'ernie-3.5-8k', name: 'ERNIE 3.5', contextWindow: 8192, inputPrice: 0.0008, outputPrice: 0.002 },
      { id: 'ernie-4.0-8k', name: 'ERNIE 4.0', contextWindow: 8192, inputPrice: 0.003, outputPrice: 0.009 },
    ]
  }
}
```

### 4.4 阿里适配器

```typescript
class AliProvider implements LLMProvider {
  name = 'ali'
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(messages: UnifiedMessage[], options?: ChatOptions): Promise<UnifiedResponse> {
    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || 'qwen-plus',
        input: { messages },
        parameters: {
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1024,
        },
      }),
    })

    const data = await response.json()

    // 阿里返回格式独特
    return {
      id: data.request_id,
      content: data.output?.text || data.output?.choices?.[0]?.message?.content,
      model: options?.model || 'qwen-plus',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: data.output?.finish_reason || 'stop',
      raw: data,
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      { id: 'qwen-turbo', name: 'Qwen Turbo', contextWindow: 8192, inputPrice: 0.0006, outputPrice: 0.0012 },
      { id: 'qwen-plus', name: 'Qwen Plus', contextWindow: 32768, inputPrice: 0.0015, outputPrice: 0.004 },
      { id: 'qwen-max', name: 'Qwen Max', contextWindow: 32768, inputPrice: 0.012, outputPrice: 0.036 },
      { id: 'qwen-vl-max', name: 'Qwen VL Max', contextWindow: 8192, inputPrice: 0.005, outputPrice: 0.015 },
    ]
  }
}
```

### 4.5 统一调用工厂

```typescript
// 工厂函数：根据配置创建对应提供者
function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'volcano':
      return new VolcanoProvider(config.apiKey)
    case 'baidu':
      return new BaiduProvider(config.apiKey, config.secretKey!)
    case 'ali':
      return new AliProvider(config.apiKey)
    // ... 其他提供者
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

// 统一调用函数
async function unifiedChat(
  provider: LLMProvider,
  messages: UnifiedMessage[],
  options?: ChatOptions
): Promise<UnifiedResponse> {
  return provider.chat(messages, options)
}

// 使用示例
async function example() {
  const volcano = createProvider({ provider: 'volcano', apiKey: 'xxx' })
  const baidu = createProvider({ provider: 'baidu', apiKey: 'xxx', secretKey: 'xxx' })

  const messages: UnifiedMessage[] = [
    { role: 'system', content: '你是中医教学助手' },
    { role: 'user', content: '什么是望诊？' },
  ]

  // 调用火山引擎
  const response1 = await unifiedChat(volcano, messages, { model: 'doubao-pro-4k' })
  console.log('火山引擎回答:', response1.content)

  // 调用百度
  const response2 = await unifiedChat(baidu, messages, { model: 'ernie-3.5-8k' })
  console.log('百度回答:', response2.content)
}
```

### 4.6 自动降级策略

```typescript
// 多提供者容错调用
async function resilientChat(
  providers: LLMProvider[],
  messages: UnifiedMessage[],
  options?: ChatOptions
): Promise<UnifiedResponse> {
  let lastError: Error | null = null

  for (const provider of providers) {
    try {
      return await provider.chat(messages, options)
    } catch (error) {
      lastError = error as Error
      console.warn(`${provider.name} 失败，尝试下一个...`)
    }
  }

  throw lastError || new Error('所有提供者都失败了')
}

// 使用示例
const providers = [
  createProvider({ provider: 'volcano', apiKey: 'xxx' }),  // 首选
  createProvider({ provider: 'baidu', apiKey: 'xxx', secretKey: 'xxx' }),  // 备选 1
  createProvider({ provider: 'ali', apiKey: 'xxx' }),  // 备选 2
]

const response = await resilientChat(providers, messages)
```

---

## 第五部分：成本优化与监控

### 5.1 Token 统计方法

```typescript
// 简单估算函数
function estimateTokens(text: string, language: 'zh' | 'en' = 'zh'): number {
  if (language === 'zh') {
    return text.length / 1.5  // 中文约 1.5 字/token
  }
  return text.split(/\s+/).length  // 英文约 1 词/token
}

// 精确计算（使用官方 tokenizer）
// 各平台提供不同的 tokenizer 库
```

### 5.2 成本核算公式

```typescript
interface CostCalculation {
  inputTokens: number
  outputTokens: number
  inputPrice: number  // 每千 tokens 价格
  outputPrice: number
}

function calculateCost(calc: CostCalculation): number {
  return (calc.inputTokens / 1000) * calc.inputPrice +
         (calc.outputTokens / 1000) * calc.outputPrice
}

// 示例：火山引擎 Doubao Pro
// 输入 500 tokens，输出 300 tokens
const cost = calculateCost({
  inputTokens: 500,
  outputTokens: 300,
  inputPrice: 0.0008,
  outputPrice: 0.002,
})
// 结果：0.001 元
```

### 5.3 限流处理策略

```typescript
// 指数退避重试
async function retryWithBackoff<T>(
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
        const delay = Math.pow(2, i) * 1000  // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }

  throw lastError
}
```

### 5.4 缓存策略

```typescript
// 简单内存缓存
const cache = new Map<string, UnifiedResponse>()

function getCacheKey(messages: UnifiedMessage[], model: string): string {
  return `${model}:${JSON.stringify(messages)}`
}

async function cachedChat(
  provider: LLMProvider,
  messages: UnifiedMessage[],
  options?: ChatOptions,
  ttl: number = 3600000  // 1 小时
): Promise<UnifiedResponse> {
  const key = getCacheKey(messages, options?.model || 'default')
  const cached = cache.get(key)

  if (cached) {
    return cached
  }

  const response = await provider.chat(messages, options)
  cache.set(key, response)

  // 设置过期
  setTimeout(() => cache.delete(key), ttl)

  return response
}
```

---

## 第六部分：附录

### A. Token 换算表

| 内容类型 | 估算公式 |
|----------|----------|
| 中文文本 | 字数 ÷ 1.5 |
| 英文文本 | 单词数 ÷ 0.75 |
| 代码 | 字符数 ÷ 4 |
| 图片（火山） | 170 tokens/张 |
| 图片（百度） | 256 tokens/张 |
| 图片（阿里） | 256 tokens/张 |
| 图片（OpenAI 低） | 85 tokens/张 |
| 图片（OpenAI 高） | 170 tokens/张 |

### B. 快速参考卡

```
火山引擎：Bearer Token，/api/v3/chat/completions，响应.choices[0].message.content
百度：OAuth access_token，/chat/{model}，响应.result
阿里：Bearer Token，/api/v1/.../generation，响应.output.text
腾讯：TC3 签名，/，响应.Response.Choices[0].Message.Content
讯飞：JWT Token，/v1/chat/completions，响应.choices[0].message.content
智谱：Bearer Token，/api/paas/v4/chat/completions，响应.choices[0].message.content
MiniMax：Bearer Token，/text/chatcompletion_v2，响应.choices[0].message
Kimi：Bearer Token，/chat/completions，响应.choices[0].message.content
OpenAI：Bearer Token，/chat/completions，响应.choices[0].message.content
```

### C. 官方资源汇总

| 平台 | 文档 | 价格 | SDK |
|------|------|------|-----|
| 火山 | https://www.volcengine.com/docs/ark | 官网查询 | 未提供 |
| 百度 | https://cloud.baidu.com/doc/WENXINWORKSHOP | 官网查询 | npm install qianfan |
| 阿里 | https://help.aliyun.com/zh/dashscope | 官网查询 | npm install @alicloud/dashscope |
| 腾讯 | https://cloud.tencent.com/document/product/1729 | 官网查询 | npm install tencentcloud-sdk-nodejs |
| 讯飞 | https://www.xfyun.cn/doc/spark | 官网查询 | 未提供 |
| 智谱 | https://open.bigmodel.cn/dev/api | 官网查询 | npm install zhipuai |
| MiniMax | https://platform.minimaxi.com/document | 官网查询 | 未提供 |
| Kimi | https://platform.moonshot.cn/docs | 官网查询 | 未提供 |
| OpenAI | https://platform.openai.com/docs | https://openai.com/pricing | npm install openai |

---

*文档结束 - 最后更新：2026-03-24*
