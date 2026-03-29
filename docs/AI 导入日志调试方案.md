# AI 智能导入 - 日志调试方案

> 本文档记录 AI 导入题库功能的日志调试方案设计，帮助定位"上传成功但识别不出题目"的问题。
> 适合初学者阅读理解，包含 Docker 日志原理讲解。

---

## 一、问题背景

### 1.1 用户反馈

> "文件可以正常上传，但完全识别不出来题目"

### 1.2 问题现象

```
用户操作：上传 PDF/Word/图片文件 → 点击提交
预期结果：AI 解析后显示识别出的题目列表
实际结果：识别结果为 0 道题，或者页面无响应
```

### 1.3 可能的故障点

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. 文件上传  │ →  │  2. AI 解析   │ →  │  3. JSON 解析 │ →  │  4. 数据入库  │
│   成功了吗？  │    │   成功了吗？  │    │   成功了吗？  │    │   成功了吗？  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

需要添加日志来追踪每一步的执行情况。

---

## 二、为什么 F12 看不到后端日志？

### 2.1 核心原因

**浏览器的 F12 控制台只能看到前端的日志，看不到后端的日志。**

```
┌─────────────────────────────────────────────────────────┐
│                      你的浏览器                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  F12 控制台 (Console)                            │    │
│  │  只能看到：前端代码的 console.log()             │    │
│  │  看不到：后端代码的 console.log()               │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ HTTP 请求
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Docker 容器 (后端)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  NestJS 应用                                    │    │
│  │  console.log() 输出到 → 容器标准输出             │    │
│  │  查看方式：docker logs panlei-backend           │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 前端 vs 后端日志对比

| 日志类型 | 代码位置 | 查看方式 |
|---------|---------|---------|
| **前端日志** | `packages/frontend/src/` 下的 `console.log()` | 浏览器 F12 → Console 标签 |
| **后端日志** | `packages/backend/src/` 下的 `console.log()` | `docker logs panlei-backend` |

### 2.3 为什么之前添加的日志看不到？

可能原因：

1. **代码修改后没有重新构建容器**
   ```bash
   # 错误做法：只重启容器（代码还是旧的）
   docker restart panlei-backend

   # 正确做法：重新构建再启动
   docker-compose -f docker-compose.dev.yml up -d --build backend
   ```

2. **日志输出到了容器内部文件，但没有挂载到宿主机**
   ```typescript
   // 如果代码里这样写：
   fs.appendFile('/app/logs/ai-import.log', ...)

   // 但 docker-compose 里没有挂载卷：
   volumes:
     - ./logs:/app/logs  # ← 如果没有这一行，日志文件在容器内看不到
   ```

3. **日志条件没有触发**
   ```typescript
   // 如果代码里有条件判断：
   if (process.env.DEBUG === 'true') {
     console.log('...')  // ← 环境变量没设置，这行不会执行
   }
   ```

---

## 三、日志方案对比

### 方案 A：console.log 快速调试

#### 实现方式
在关键代码位置直接添加 `console.log()`，日志输出到容器标准输出。

#### 代码示例
```typescript
async createImportTask(tenantId, userId, files, categoryId, model) {
  console.log('[AI-IMPORT] 收到上传请求', {
    tenantId,
    userId,
    fileCount: files?.length,
    categoryId,
    model
  })
  // ... 后续代码
}
```

#### 查看方式
```bash
# 实时查看后端日志
docker logs -f panlei-backend

# 或者只看最近的 100 行
docker logs --tail 100 panlei-backend
```

#### 优点
| # | 优点 | 说明 |
|---|------|------|
| 1 | **快** | 改完代码 → 重启容器 → 立即生效，5 分钟内搞定 |
| 2 | **简单** | 不需要新增文件、不需要配置卷挂载 |
| 3 | **临时性好** | 调试完后可以干净删除，不留痕迹 |
| 4 | **实时查看** | `docker logs -f` 可以像看直播一样看到日志流动 |

#### 缺点
| # | 缺点 | 影响 |
|---|------|------|
| 1 | **日志不持久** | 容器删除后日志丢失 |
| 2 | **无法按条件筛选** | 只能看所有日志，不能只筛选 AI 导入的 |
| 3 | **无日志级别控制** | 生产环境也会输出调试信息 |
| 4 | **无法回溯** | 问题发生后，如果没实时盯着日志就看不到了 |

#### 适用场景
- ✅ 临时调试，定位具体问题
- ✅ 开发环境快速验证
- ❌ 不适合生产环境长期运行

---

### 方案 A+：带环境变量控制的 console.log

#### 实现方式
在方案 A 的基础上，增加环境变量控制，只有需要时才输出日志。

#### 代码示例
```typescript
// 在文件顶部添加
const DEBUG = process.env.DEBUG_AI_IMPORT === 'true'

// 调试代码
if (DEBUG) {
  console.log('[AI-IMPORT] 详细调试信息', data)
}
```

#### 启用方式
```bash
# 在 docker-compose.dev.yml 中添加环境变量
environment:
  DEBUG_AI_IMPORT: 'true'

# 然后重启容器
docker-compose -f docker-compose.dev.yml up -d backend
```

#### 优点（相比方案 A）
| # | 优点 | 说明 |
|---|------|------|
| 1 | **可控** | 需要调试时开启，平时关闭 |
| 2 | **不影响生产** | 生产环境不设置环境变量，不会输出调试日志 |
| 3 | **代码改动小** | 和方案 A 差不多的工作量 |

#### 缺点
| # | 缺点 | 影响 |
|---|------|------|
| 1 | 还是不能持久化 | 容器删除后日志丢失 |
| 2 | 每次调试要改配置 | 需要修改 docker-compose 或重启容器 |

---

### 方案 B：独立 Logger 服务（完整方案）

#### 实现方式
新建一个日志服务，日志写入文件，并将文件挂载到宿主机。

#### 项目结构
```
packages/backend/
├── src/
│   └── common/
│       └── logger/
│           └── logger.service.ts    # 新增：日志服务
├── logs/                            # 新增：日志目录
│   ├── ai-import.log
│   ├── error.log
│   └── app.log
```

#### 代码示例
```typescript
// logger.service.ts
@Injectable()
export class LoggerService {
  log(module: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logLine = `[${timestamp}][${module}] ${message} ${data ? JSON.stringify(data) : ''}\n`

    // 同时输出到控制台和文件
    console.log(logLine)
    fs.appendFile('logs/app.log', logLine)
  }
}

// ai-import.service.ts 中使用
constructor(private logger: LoggerService) {}

async createImportTask(...) {
  this.logger.log('AiImportService', '收到上传请求', { tenantId, fileCount })
}
```

#### Docker 配置
```yaml
# docker-compose.dev.yml
services:
  backend:
    volumes:
      - ./logs:/app/logs  # 挂载日志目录到宿主机
```

#### 优点
| # | 优点 | 说明 |
|---|------|------|
| 1 | **日志持久化** | 日志文件在宿主机，容器删除也不丢 |
| 2 | **分级控制** | 可配置只记录 ERROR 或 INFO，生产/开发不同策略 |
| 3 | **可追溯** | 问题发生后可以翻历史日志 |
| 4 | **可复用** | 其他模块也可以用同一套 Logger |
| 5 | **专业** | 支持日志轮转、按天切割、压缩归档 |

#### 缺点
| # | 缺点 | 影响 |
|---|------|------|
| 1 | **工作量大** | 需要新建服务、修改配置、挂载卷，预计 1-2 小时 |
| 2 | **需要改 docker-compose** | 增加卷挂载，可能影响其他开发者的环境 |
| 3 | **维护成本** | 日志文件会越来越大，需要定期清理 |
| 4 | **过度设计风险** | 如果只是为了调试这一个问题，可能不值得 |

#### 适用场景
- ✅ 生产环境长期运行
- ✅ 需要长期监控的模块
- ❌ 临时调试用不上这么多功能

---

## 四、方案对比总结

| 维度 | 方案 A | 方案 A+ | 方案 B |
|------|--------|--------|--------|
| 实施时间 | 5-10 分钟 | 10-15 分钟 | 1-2 小时 |
| 代码改动量 | 少 | 少 | 多 |
| 日志持久化 | ❌ | ❌ | ✅ |
| 开关控制 | ❌ | ✅ | ✅ |
| 可复用性 | ❌ | ❌ | ✅ |
| 临时调试友好 | ✅ | ✅ | ❌ |
| 生产环境友好 | ❌ | ✅ | ✅ |

---

## 五、需要添加日志的关键节点

无论选择哪个方案，以下位置都需要添加日志：

| 节点 | 位置 | 日志内容 | 优先级 |
|------|------|----------|--------|
| **1** | Controller 入口 | tenantId, userId, files 信息 | P0 |
| **2** | 文件上传前 | 临时路径、文件大小 | P1 |
| **3** | 文件上传后 | 实际路径、写入状态 | P1 |
| **4** | AI 调用前 | API Key、Endpoint、模型、Prompt | P0 |
| **5** | AI 调用后 | HTTP 状态、响应时间、响应体 | P0 |
| **6** | AI 内容处理 | 原始内容预览、是否包含 JSON | P0 |
| **7** | JSON 解析 | 解析结果、题目数量 | P0 |
| **8** | 数据验证 | 每道题的字段校验结果 | P1 |
| **9** | 保存数据库 | 保存的题目数量、失败原因 | P1 |
| **10** | 任务完成 | 最终统计（成功/失败） | P2 |

---

## 六、Docker 容器日志原理（初学者必读）

### 6.1 什么是容器标准输出？

```
┌──────────────────────────────────────┐
│  Docker 容器                          │
│  ┌────────────────────────────────┐  │
│  │  你的应用 (NestJS)             │  │
│  │                                 │  │
│  │  console.log('Hello')  ──────┐ │  │
│  │                              │ │  │
│  │  标准输出 (stdout) ◄─────────┘ │  │
│  │  标准错误 (stderr)             │  │
│  └────────────────────────────────┘  │
│         │                            │
│         ▼                            │
│  Docker 守护进程                      │
│         │                            │
│         ▼                            │
│  日志文件                             │
│  /var/lib/docker/containers/...      │
└──────────────────────────────────────┘
         │
         ▼
你执行：docker logs <容器名>
```

### 6.2 为什么日志不保存到文件就看不到？

**因为容器是"用完即扔"的设计**：

```
容器删除后，里面的文件（包括日志）都会消失！

┌─────────────────────────────────────┐
│  容器内的文件系统                    │
│  /app/logs/ai-import.log           │
│  ↑                                  │
│  │  容器删除 → 文件消失              │
│  │                                  │
│  │  正确做法：挂载到宿主机           │
│  │  volumes:                        │
│  │    - ./logs:/app/logs           │
│  │          ↑                       │
│  │          │ 宿主机目录            │
│  │          │ 容器删除后还在        │
└─────────────────────────────────────┘
```

### 6.3 日志文件挂载图解

```
宿主机                          Docker 容器
┌─────────────────┐           ┌─────────────────┐
│  /项目/logs/    │ ◄──────── │  /app/logs/     │
│  ai-import.log  │   挂载    │  ai-import.log  │
│                 │           │                 │
│  容器删除后     │           │  容器删除后     │
│  文件还在 ✓     │           │  容器消失 ✗     │
└─────────────────┘           └─────────────────┘
```

---

## 七、常用命令速查

### 7.1 查看后端日志
```bash
# 查看所有日志
docker logs panlei-backend

# 实时查看（类似直播）
docker logs -f panlei-backend

# 只看最近 100 行
docker logs --tail 100 panlei-backend

# 带上时间戳
docker logs -t panlei-backend
```

### 7.2 重新构建容器
```bash
# 重新构建并启动后端
docker-compose -f docker-compose.dev.yml up -d --build backend

# 重新构建并启动所有服务
docker-compose -f docker-compose.dev.yml up -d --build
```

### 7.3 进入容器内部
```bash
# 进入后端容器
docker exec -it panlei-backend sh

# 查看容器内的日志文件
docker exec panlei-backend cat /app/logs/ai-import.log
```

### 7.4 容器状态检查
```bash
# 查看运行中的容器
docker ps

# 查看容器资源占用
docker stats
```

---

## 八、推荐方案

**建议先用方案 A+ 调试，确认问题后再决定是否需要方案 B**

理由：
1. 现在的问题是**"识别不出来"**，需要先定位具体哪一步失败
2. 方案 A+ 可以在 10 分钟内看到效果，快速迭代
3. 等系统稳定后，如果确实需要长期日志监控，再升级方案 B 不迟

---

## 九、实施步骤（方案 A+）

### 步骤 1：修改代码
在 `ai-import.service.ts` 的关键位置添加：
```typescript
const DEBUG = process.env.DEBUG_AI_IMPORT === 'true'

// 在关键函数中
if (DEBUG) {
  console.log('[AI-IMPORT] 详细调试信息', data)
}
```

### 步骤 2：修改 docker-compose
```yaml
# docker-compose.dev.yml
services:
  backend:
    environment:
      DEBUG_AI_IMPORT: 'true'  # 添加这一行
```

### 步骤 3：重新构建并启动
```bash
docker-compose -f docker-compose.dev.yml up -d --build backend
```

### 步骤 4：实时查看日志
```bash
docker logs -f panlei-backend
```

### 步骤 5：复现问题
在前端页面重新上传文件，观察后端日志输出。

---

## 十、故障排查流程

```
1. 前端上传文件
         │
         ▼
2. 打开终端运行：docker logs -f panlei-backend
         │
         ▼
3. 观察日志输出：
   ├── 看到 "收到上传请求" → 请求到达后端 ✓
   ├── 看到 "文件上传成功" → 文件保存成功 ✓
   ├── 看到 "调用 AI API" → 开始调用 AI ✓
   ├── 看到 "AI API 响应" → AI 有返回 ✓
   │       │
   │       ├── HTTP 200 → 调用成功
   │       └── HTTP 4xx/5xx → API 报错
   │
   ├── 看到 "JSON 解析成功" → 解析成功 ✓
   │       │
   │       ├── 题目数量 > 0 → AI 识别成功
   │       └── 题目数量 = 0 → AI 返回空数组
   │
   └── 看到 "JSON 解析失败" → AI 返回格式不对
         │
         ▼
4. 根据日志定位问题 → 修复代码
```

---

## 十一、常见问题 FAQ

### Q1: 为什么我执行 `docker logs` 什么都没有？
**A:** 可能原因：
1. 容器还没启动成功 → 执行 `docker ps` 确认
2. 日志级别太高 → 添加 `DEBUG_AI_IMPORT=true` 环境变量
3. 代码没有重新构建 → 执行 `--build` 参数

### Q2: 日志太多看不过来怎么办？
**A:** 使用 grep 过滤：
```bash
docker logs -f panlei-backend 2>&1 | grep AI-IMPORT
```

### Q3: 怎么保存日志到本地文件？
**A:**
```bash
docker logs panlei-backend > backend-log.txt
```

### Q4: 为什么方案 B 不直接做？
**A:** 杀鸡不用牛刀。临时调试问题，方案 A+ 足够。如果以后需要：
- 日志分析系统（如 ELK）
- 日志告警
- 日志审计

再考虑方案 B 或更专业的方案。

---

## 十二、下一步行动

1. **确认选择哪个方案** - 推荐方案 A+
2. **实施日志代码** - 在关键位置添加 console.log
3. **重新构建容器** - `docker-compose up -d --build`
4. **复现问题并观察日志** - 找到具体故障点
5. **修复问题** - 根据日志定位的原因修复

---

**文档版本**: v1.0
**更新时间**: 2026-03-27
**适用环境**: 开发环境 (Docker Compose)

---

## 十三、方案 A+ 实施记录（已执行）

### 执行时间
2026-03-27 12:40

### 修改内容

#### 1. 代码修改
`packages/backend/src/modules/questions/services/ai-import.service.ts`

**新增环境变量控制：**
```typescript
// 在文件顶部添加
const DEBUG = process.env.DEBUG_AI_IMPORT === 'true'
const debugLog = (context: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[AI-IMPORT][DEBUG][${context}] ${message}`, data ? JSON.stringify(data) : '')
  }
}
```

**修改日志函数：**
```typescript
function log(level: LogLevel, context: string, message: string, data?: any) {
  // 如果关闭调试模式，只输出 ERROR 级别
  if (!DEBUG && level !== LogLevel.ERROR) {
    return
  }
  // ... 其余代码
}
```

**新增 JSON 提取逻辑：**
```typescript
// 如果 AI 返回的内容包含额外文字，尝试提取 JSON
if (!cleanJson.startsWith('{') && !cleanJson.startsWith('[')) {
  debugLog('parseQuestionsWithAI', '检测到非 JSON 格式，尝试提取', { preview: cleanJson.substring(0, 200) })

  // 尝试提取第一个 JSON 数组
  const jsonMatch = cleanJson.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    cleanJson = jsonMatch[0]
    debugLog('parseQuestionsWithAI', '成功提取 JSON 数组', { length: cleanJson.length })
  }
}
```

**新增 confirmImport 日志：**
```typescript
async confirmImport(...) {
  debugLog('confirmImport', '开始确认导入', { taskId, tenantId, itemIds, categoryId, difficulty })
  // ... 每一步都有详细日志
}
```

#### 2. Docker 配置修改
`docker-compose.dev.yml`

```yaml
services:
  backend:
    environment:
      DEBUG_AI_IMPORT: 'true'  # 新增：开启调试日志
    volumes:
      - ./logs:/app/logs       # 新增：挂载日志目录到宿主机
```

#### 3. 创建日志目录
```bash
mkdir -p c:/项目/panlei/logs
```

### 查看日志方式

#### 方式 1：实时查看容器日志
```bash
docker logs -f panlei-backend
```

#### 方式 2：查看日志文件
```bash
cat c:/项目/panlei/logs/ai-import.log
```

#### 方式 3：过滤查看
```bash
docker logs panlei-backend 2>&1 | grep AI-IMPORT
```

### 测试步骤

1. **确保容器已启动**
   ```bash
   docker ps | grep panlei-backend
   ```

2. **打开终端运行日志监控**
   ```bash
   docker logs -f panlei-backend
   ```

3. **在前端页面执行操作**
   - 访问 http://localhost:5173
   - 进入题库管理 → AI 智能导入
   - 上传文件并提交

4. **观察日志输出**
   你应该看到类似以下的日志：
   ```
   [AI-IMPORT][INFO][...][createImportTask] 开始创建导入任务 | {"tenantId":"...", "fileCount":1}
   [AI-IMPORT][INFO][...][uploadFile] 开始上传文件 | {"originalname":"test.pdf", "size":12345}
   [AI-IMPORT][INFO][...][uploadFile] 文件写入成功 | {"filePath":"/app/uploads/..."}
   [AI-IMPORT][INFO][...][processFiles] 开始处理文件 | {"taskId":"...", "filePaths":["..."]}
   [AI-IMPORT][INFO][...][parseQuestionsWithAI_start] 准备调用 AI API | {...}
   [AI-IMPORT][INFO][...][parseQuestionsWithAI_response] AI API 响应 | {...}
   [AI-IMPORT][INFO][...][parseQuestionsWithAI_json] JSON 解析成功 | {"questionCount":5}
   [AI-IMPORT][DEBUG][confirmImport] 开始确认导入 | {...}
   [AI-IMPORT][DEBUG][confirmImport] 导入单个题目 | {...}
   [AI-IMPORT][DEBUG][confirmImport] 题目创建成功 | {"questionId":"..."}
   ```

### 常见问题

#### Q: 看不到日志怎么办？
**A:** 检查以下几点：
1. 容器是否正常运行：`docker ps | grep panlei-backend`
2. 环境变量是否生效：`docker exec panlei-backend sh -c "echo $DEBUG_AI_IMPORT"`
   - 应该输出 `true`
3. 代码是否重新构建：`docker-compose -f docker-compose.dev.yml up -d --build backend`

#### Q: 日志太多看不过来怎么办？
**A:** 使用 grep 过滤：
```bash
docker logs panlei-backend 2>&1 | grep AI-IMPORT
```

#### Q: 如何关闭调试日志？
**A:** 修改 `docker-compose.dev.yml`，删除或注释掉 `DEBUG_AI_IMPORT: 'true'`，然后重启容器：
```bash
docker-compose -f docker-compose.dev.yml up -d backend
```

---

**文档版本**: v1.1  
**更新时间**: 2026-03-27 12:40  
**实施状态**: 方案 A+ 已实施并测试
