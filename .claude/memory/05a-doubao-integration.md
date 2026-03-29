# 豆包大模型（火山引擎）对接文档

> 版本：v2.1
> 最后更新：2026-03-29
> 官方文档：https://www.volcengine.com/docs/82379

---

## 一、基础信息

| 项目 | 值 |
|------|-----|
| **服务商** | 火山引擎 |
| **控制台** | https://console.volcengine.com/ark |
| **基础端点** | `https://ark.cn-beijing.volces.com/api/v3` |
| **鉴权方式** | Bearer Token（API Key） |
| **文件上传端点** | `https://ark.cn-beijing.volces.com/api/v3/files` |
| **Responses API 端点** | `https://ark.cn-beijing.volces.com/api/v3/responses` |
| **Chat API 端点** | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` |

---

## 二、模型矩阵（来自数据库）

### 2.1 对话模型

| 模型名称 | 模型 ID（EP） | 输入价格 | 输出价格 | 状态 |
|----------|--------------|----------|----------|------|
| Doubao-Seed-2.0-lite | `ep-20260315163053-ns7kz` | ¥0.8/千 tokens | ¥8/千 tokens | ✅ |
| Doubao-Seed-2.0-pro | `ep-20260311205526-5qkpl` | ¥1/千 tokens | ¥2/千 tokens | ✅ |

### 2.2 图片生成模型

| 模型名称 | 模型 ID（EP） | 价格 | 状态 |
|----------|--------------|------|------|
| Doubao-Seedream-5.0-lite | `ep-20260313201916-mnktm` | ¥0.000002/张 | ✅ |

---

## 三、文件上传（Files API）

### 3.1 文件限制

| 输入方式 | 文件大小限制 | 说明 |
|----------|-------------|------|
| **Files API 上传** | ≤ 512 MB | 推荐，文件存储 7 天（可配置 1-30 天） |
| **Base64 编码** | ≤ 50 MB | 请求体 ≤ 64 MB |
| **文件 URL** | ≤ 50 MB | 需公网可访问 |

### 3.2 Node.js 代码示例

```typescript
// 安装：npm install openai
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.ARK_API_KEY,
})

// 上传文件
const file = await client.files.create({
  file: fs.createReadStream('/path/to/doc.pdf'),
  purpose: 'user_data',
})

// 等待处理完成
while (file.status === 'processing') {
  await new Promise(r => setTimeout(r, 2000))
  const updated = await client.files.retrieve(file.id)
  file.status = updated.status
}
```

```bash
# curl 上传
curl https://ark.cn-beijing.volces.com/api/v3/files \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -F 'purpose=user_data' \
  -F 'file=@/path/to/doc.pdf'
```

---

## 四、文档理解 API（Responses API）

### 4.1 支持模型

支持 PDF 格式文档，模型会将 PDF 分页处理成多图，通过视觉功能理解。

推荐模型：`doubao-seed-2-0-lite-260215`

### 4.2 三种输入方式

#### 方式一：File ID（推荐）

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.ARK_API_KEY,
})

const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: [{
    role: 'user',
    content: [
      { type: 'input_file', file_id: file.id },
      { type: 'input_text', text: '请提取文档内容' }
    ]
  }]
})
```

```bash
curl https://ark.cn-beijing.volces.com/api/v3/responses \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "doubao-seed-2-0-lite-260215",
    "input": [{
        "role": "user",
        "content": [
            {"type": "input_file", "file_id": "file-xxxxx"},
            {"type": "input_text", "text": "请提取文档内容"}
        ]
    }]
  }'
```

#### 方式二：File URL

```typescript
const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: [{
    role: 'user',
    content: [
      { type: 'input_file', file_url: 'https://example.com/doc.pdf' },
      { type: 'input_text', text: '请提取文档内容' }
    ]
  }]
})
```

#### 方式三：Base64 编码

```typescript
import fs from 'fs'

const base64File = fs.readFileSync('/path/to/doc.pdf', 'base64')

const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: [{
    role: 'user',
    content: [
      {
        type: 'input_file',
        file_data: `data:application/pdf;base64,${base64File}`,
        filename: 'doc.pdf'
      },
      { type: 'input_text', text: '请提取文档内容' }
    ]
  }]
})
```

### 4.3 流式输出

```typescript
const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: [{
    role: 'user',
    content: [
      { type: 'input_file', file_id: file.id },
      { type: 'input_text', text: '请提取文档内容' }
    ]
  }],
  stream: true
})

for await (const event of response) {
  if (event.type === 'response.output_text.delta') {
    process.stdout.write(event.delta)
  }
}
```

### 4.4 关键参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| `type`（文件） | `input_file` | 固定值 |
| `type`（文本） | `input_text` | 固定值，**不是** `text` |
| `file_id` | 上传返回的 ID | Files API 上传后获取 |
| `file_url` | 公网 URL | 需可访问 |
| `file_data` | Base64 字符串 | 格式：`data:{mime};base64,{data}` |
| `filename` | 文件名 | 使用 `file_data` 时必填 |

---

## 五、图片理解 API

### 5.1 支持模型

视觉理解模型，支持图片 OCR 识别。

### 5.2 请求格式

```typescript
const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: [{
    role: 'user',
    content: [
      { type: 'input_image', file_id: file.id },
      { type: 'input_text', text: '请提取图片中的文字' }
    ]
  }]
})
```

### 5.3 图片输入方式

| 方式 | 字段 | 说明 |
|------|------|------|
| File ID | `{"type": "input_image", "file_id": "xxx"}` | 推荐 |
| Image URL | `{"type": "image_url", "image_url": {"url": "https://..."}}` | 在线图片 |
| Base64 | `{"type": "input_image", "file_data": "data:image/png;base64,xxx"}` | 本地图片 |

---

## 六、对话 API（Chat Completions）

### 6.1 标准对话（Node.js）

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.ARK_API_KEY,
})

const response = await client.chat.completions.create({
  model: 'ep-20260315163053-ns7kz',
  messages: [
    { role: 'system', content: '你是助手' },
    { role: 'user', content: '你好' }
  ]
})

console.log(response.choices[0].message.content)
```

### 6.2 流式对话

```typescript
const response = await client.chat.completions.create({
  model: 'ep-20260315163053-ns7kz',
  messages: [{ role: 'user', content: '你好' }],
  stream: true
})

for await (const chunk of response) {
  if (chunk.choices[0].delta.content) {
    process.stdout.write(chunk.choices[0].delta.content)
  }
}
```

### 6.3 原生 fetch 调用（无需 SDK）

```typescript
const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'ep-20260315163053-ns7kz',
    messages: [
      { role: 'system', content: '你是助手' },
      { role: 'user', content: '你好' }
    ]
  })
})

const data = await response.json()
console.log(data.choices[0].message.content)
```

---

## 七、图片生成 API

### 7.1 请求格式

```typescript
const response = await client.images.generations({
  model: 'ep-20260313201916-mnktm',
  prompt: '一只可爱的小猫',
  size: '1024x1024',
  n: 1
})

console.log(response.data[0].url)
```

---

## 八、错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求格式和必填字段 |
| 401 | 认证失败 | 检查 API Key |
| 403 | 权限不足 | 检查余额/权限 |
| 429 | 请求超限 | 降低频率 |
| 500 | 服务器错误 | 稍后重试 |

---

## 九、常见错误对照

### ❌ 错误写法 vs ✅ 正确写法

#### 1. 文档理解 API 端点

```typescript
// ❌ 错误：使用 chat/completions
await client.chat.completions.create({ model: 'xxx', messages: [...] })

// ✅ 正确：使用 responses
await client.responses.create({ model: 'xxx', input: [...] })
```

#### 2. 文本类型字段

```json
// ❌ 错误
{ "type": "text", "text": "内容" }

// ✅ 正确
{ "type": "input_text", "text": "内容" }
```

#### 3. 请求参数

```json
// ❌ 错误（Chat API 格式）
{ "model": "xxx", "messages": [...] }

// ✅ 正确（Responses API 格式）
{ "model": "xxx", "input": [...] }
```

#### 4. 文件类型

```json
// ❌ 错误：用 input_file 传图片
{ "type": "input_file", "file_id": "xxx" }  // 图片

// ✅ 正确：图片用 input_image
{ "type": "input_image", "file_id": "xxx" }  // 图片
{ "type": "input_file", "file_id": "xxx" }   // 文档
```

---

## 十、Node.js 项目依赖

### 方式一：OpenAI SDK（推荐）

```bash
npm install openai
```

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.ARK_API_KEY,
})
```

### 方式二：原生 fetch（无需依赖）

Node.js 18+ 内置 `fetch`，无需额外安装。

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v2.1 | 2026-03-29 | 修正：提供 Node.js + OpenAI SDK 示例，匹配项目技术栈 |
| v2.0 | 2026-03-29 | 基于官方文档修正：Responses API、input_text 类型、512MB 限制 |
| v1.0 | 2026-03-28 | 初始版本 |
