# AI 导入题库功能设计方案

> 文档版本：v1.0
> 创建时间：2026-03-24
> 状态：待开发

---

## 一、功能概述

### 1.1 需求背景

当前题库管理支持手动录入题目和 Excel 批量导入，但实际使用场景中，教师手头已有大量现成题目资源，格式多样：

| 来源格式 | 说明 | 痛点 |
|---------|------|------|
| Word 文档 | 试卷、习题集（.docx） | 无法直接导入，需手动抄录 |
| PDF 文档 | 扫描版试卷、电子习题 | 无法提取文字，只能拍照识别 |
| 图片/照片 | 纸质试卷拍照、截图 | 需人工逐字录入，效率极低 |

### 1.2 功能目标

通过 AI 能力实现**多格式题目智能识别 + 自动结构化录入**：

1. **支持多种输入格式**：Word(.docx)、PDF、图片(JPG/PNG)
2. **自动题型识别**：单选题、多选题、判断题、填空题
3. **自动结构化**：题目内容、选项 (A/B/C/D)、正确答案、解析
4. **批量处理**：一次上传多个文件，批量识别后统一入库
5. **人工校对**：AI 识别结果需人工确认后再入库，确保准确性

---

## 二、技术架构

### 2.1 整体流程

```
┌─────────────────────────────────────────────────────────────────┐
│  用户上传文件（Word / PDF / 图片）                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  文件预处理（格式转换）                                           │
│  - Word (.docx) → 提取文本 → 分段                               │
│  - PDF → 文本型：直接提取 / 扫描版：OCR 识别                       │
│  - 图片 → OCR 识别 → 文本                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI 大模型智能解析（火山引擎豆包 API）                              │
│  Prompt: "从以下文本中提取题目，返回 JSON 格式：{type, content,   │
│  options[], answer, explanation}"                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  结构化结果校对（前端界面）                                       │
│  用户确认/修改 → 选择分类 → 批量入库                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术方案 | 说明 |
|------|---------|------|
| **文件解析** | `mammoth.js` (Word) | 提取.docx 文本内容 |
| | `pdf-parse` (PDF 文本) | 提取文本型 PDF |
| | `pdfjs-dist` (PDF 图片) | 扫描版 PDF 转图片后 OCR |
| | 原生 Canvas (图片) | 图片预览 + 预处理 |
| **OCR 识别** | 火山引擎 OCR API | 通用文字识别 + 表格识别 |
| **AI 解析** | 火山引擎豆包大模型 | 题目结构化提取 |
| **后端** | NestJS + Prisma | 文件上传、任务队列、结果存储 |
| **前端** | Vue3 + Element Plus | 上传界面、校对界面、进度展示 |

---

## 三、数据库设计

### 3.1 新增数据表

```prisma
// AI 导入任务记录
model AiImportTask {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String
  fileType     String   // word / pdf / image
  fileName     String   // 原始文件名
  fileUrl      String   // OSS 存储路径
  status       String   // pending / processing / completed / failed
  totalCount   Int      @default(0)  // 识别题目总数
  successCount Int      @default(0)  // 成功入库数量
  errorCount   Int      @default(0)  // 失败数量
  parsedData   Json?    // AI 解析结果（结构化题目数组）
  createdAt    DateTime @default(now())
  completedAt  DateTime?

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  user         User     @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([status])
  @@map("ai_import_tasks")
}

// AI 导入题目详情（校对用）
model AiImportItem {
  id           String   @id @default(cuid())
  taskId       String
  questionType String   // SINGLE / MULTIPLE / JUDGE / FILL
  content      String   @db.Text
  options      Json?    // { label: 'A', content: '...' }[]
  answer       String   // 正确答案
  explanation  String?  @db.Text
  difficulty   String   @default('MEDIUM') // EASY / MEDIUM / HARD
  status       String   // pending / confirmed / skipped / imported
  importedId   String?  // 导入后的 Question ID
  errorMessage String?  // 错误信息
  createdAt    DateTime @default(now())

  task         AiImportTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId, status])
  @@map("ai_import_items")
}
```

---

## 四、后端接口设计

### 4.1 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/questions/ai-import/upload` | 上传文件（支持多文件） |
| GET | `/questions/ai-import/tasks` | 获取导入任务列表 |
| GET | `/questions/ai-import/tasks/:id` | 获取任务详情（含题目列表） |
| POST | `/questions/ai-import/tasks/:id/confirm` | 确认导入（批量入库） |
| POST | `/questions/ai-import/tasks/:id/skip` | 跳过指定题目 |
| DELETE | `/questions/ai-import/tasks/:id` | 删除任务 |

### 4.2 接口详细设计

#### 4.2.1 上传文件

```typescript
// POST /questions/ai-import/upload
// Request: multipart/form-data
{
  files: File[]  // 支持多文件
  categoryId?: string  // 目标分类（可选）
}

// Response:
{
  code: 0,
  data: {
    taskId: 'xxx',
    fileCount: 3,
    status: 'processing'
  }
}
```

#### 4.2.2 获取任务列表

```typescript
// GET /questions/ai-import/tasks?page=1&pageSize=20
// Response:
{
  code: 0,
  data: {
    total: 10,
    list: [
      {
        id: 'xxx',
        fileName: '中医诊断学试卷.docx',
        fileType: 'word',
        status: 'completed',
        totalCount: 25,
        successCount: 0,
        createdAt: '2026-03-24 10:30:00'
      }
    ]
  }
}
```

#### 4.2.3 获取任务详情（校对界面）

```typescript
// GET /questions/ai-import/tasks/:id
// Response:
{
  code: 0,
  data: {
    id: 'xxx',
    fileName: '中医诊断学试卷.docx',
    status: 'completed',
    totalCount: 25,
    items: [
      {
        id: 'item_1',
        questionType: 'SINGLE',
        content: '中医诊断学的基本原理不包括：',
        options: [
          { label: 'A', content: '整体观念', isCorrect: false },
          { label: 'B', content: '辨证论治', isCorrect: false },
          { label: 'C', content: '阴阳五行', isCorrect: true },
          { label: 'D', content: '脏腑经络', isCorrect: false }
        ],
        answer: 'C',
        explanation: '中医诊断学基本原理包括整体观念和辨证论治...',
        difficulty: 'MEDIUM',
        status: 'pending'
      }
    ]
  }
}
```

#### 4.2.4 确认导入

```typescript
// POST /questions/ai-import/tasks/:id/confirm
// Request:
{
  itemIds: ['item_1', 'item_2'],  // 选中的题目 ID
  categoryId: 'xxx',  // 目标分类
  difficulty: 'MEDIUM'  // 统一难度（可选）
}

// Response:
{
  code: 0,
  data: {
    successCount: 2,
    failedCount: 0,
    importedQuestions: [...]
  }
}
```

---

## 五、前端界面设计

### 5.1 入口位置

**题库管理页面** (`QuestionsView.vue`) 新增按钮：

```
[AI 智能导入]  [新增题目]  [批量导入 (Excel)]  [导出 Excel]
```

### 5.2 AI 导入流程界面

#### Step 1: 上传文件

```
┌───────────────────────────────────────────────────────────────┐
│  AI 智能导入题目                                  [关闭]        │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  支持格式：Word (.docx) / PDF / 图片 (JPG/PNG)                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │           📁 点击或拖拽文件到此处                        │ │
│  │                                                         │ │
│  │           支持多文件同时上传                              │ │
│  │           单个文件最大 50MB                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  已选择文件 (3):                                               │
│  📄 中医诊断学期中试卷.docx      2.3 MB    ✓ 就绪             │
│  📄 中药学题库.pdf              5.1 MB    ✓ 就绪             │
│  🖼️ 针灸学题目.png              1.2 MB    ✓ 就绪             │
│                                                               │
│  目标分类：[选择分类 ▼] (可选，也在校对时选择)                  │
│                                                               │
│                       [取消]  [开始识别]                      │
└───────────────────────────────────────────────────────────────┘
```

#### Step 2: AI 识别中（进度展示）

```
┌───────────────────────────────────────────────────────────────┐
│  AI 识别中...                                    [后台处理]    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  正在处理：中药学题库.pdf (2/3)                                │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ ████████████████████████░░░░░░░░ 66%                 │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  进度详情：                                                   │
│  ✓ 中医诊断学期中试卷.docx  → 识别完成 (25 题)               │
│  ⏳ 中药学题库.pdf          → 识别中...                       │
│  ○ 针灸学题目.png           → 等待中                         │
│                                                               │
│  预计剩余时间：约 2 分钟                                        │
│                                                               │
│  💡 AI 识别完成后将进入校对环节，请确认题目准确性后再入库       │
│                                                               │
│                       [取消识别]                              │
└───────────────────────────────────────────────────────────────┘
```

#### Step 3: 校对确认

```
┌───────────────────────────────────────────────────────────────────┐
│  校对确认 - 中医诊断学期中试卷.docx                  [完成导入]    │
├───────────────────────────────────────────────────────────────────┤
│  识别完成：共 25 题  |  已校对：0/25  |  待确认                      │
│                                                                  │
│  目标分类： [中医诊断学 ▼]    统一难度：[中等 ▼]                 │
│  ☑ 仅显示未校对题目                                                │
│                                                                  │
├───────────────────────────────────────────────────────────────────┤
│  ☐ #1 [单选题] 已校对 ✓                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 题目：中医诊断学的基本原理不包括：                           │  │
│  │                                                            │  │
│  │ 选项：                                                     │  │
│  │   ☐ A. 整体观念                                            │  │
│  │   ☐ B. 辨证论治     【答案：C】                             │  │
│  │   ● C. 阴阳五行     解析：中医诊断学基本原理包括...         │  │
│  │   ☐ D. 脏腑经络                                            │  │
│  │                                                            │  │
│  │  【修改】 【删除此题】 【标记跳过】                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ☐ #2 [多选题] 待校对                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 题目：望诊的内容包括：                                     │  │
│  │                                                            │  │
│  │ 选项：                                                     │  │
│  │   ☐ A. 望神         【答案：ABCE】                          │  │
│  │   ☐ B. 望色         解析：望诊包括望神、望色、...          │  │
│  │   ☐ C. 望形态                                              │  │
│  │   ☐ D. 问病情       ⚠️ 答案格式错误，请修正                │  │
│  │   ☐ E. 望舌象                                              │  │
│  │                                                            │  │
│  │  【修改】 【删除此题】 【标记跳过】                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ... (可折叠，点击展开)                                           │
│                                                                  │
├───────────────────────────────────────────────────────────────────┤
│  已选择 2 题    [批量确认选中的]  [全部确认]  [取消]              │
└───────────────────────────────────────────────────────────────────┘
```

#### Step 4: 修改题目（弹窗）

```
┌───────────────────────────────────────────────────────────────┐
│  编辑题目 #2                                    [保存] [取消]  │
├───────────────────────────────────────────────────────────────┤
│  题型：[多选题 ▼]    难度：[中等 ▼]                           │
│                                                              │
│  题目内容（支持 HTML）：                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 望诊的内容包括：                                       │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  选项设置：                                                  │
│  ┌────┬────────────────────────────┬─────────────────────┐  │
│  │ ☑  │ A. 望神                    │ ☐ 正确答案          │  │
│  ├────┼────────────────────────────┼─────────────────────┤  │
│  │ ☑  │ B. 望色                    │ ☐ 正确答案          │  │
│  ├────┼────────────────────────────┼─────────────────────┤  │
│  │ ☑  │ C. 望形态                  │ ☐ 正确答案          │  │
│  ├────┼────────────────────────────┼─────────────────────┤  │
│  │ ☐  │ D. 问病情                  │ ☐ 正确答案          │  │
│  ├────┼────────────────────────────┼─────────────────────┤  │
│  │ ☑  │ E. 望舌象                  │ ☐ 正确答案          │  │
│  └────┴────────────────────────────┴─────────────────────┘  │
│  [+ 添加选项]                                                │
│                                                              │
│  正确答案：[ABCE]  （多选题自动根据勾选生成）                 │
│                                                              │
│  题目解析：                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 望诊包括望神、望色、望形态、望舌象等，不包括问诊。    │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 六、后端服务实现

### 6.1 核心服务模块

```
backend/src/modules/questions/
├── services/
│   ├── ai-import.service.ts      # AI 导入核心服务
│   ├── file-parser.service.ts    # 文件解析服务
│   ├── ai-parser.service.ts      # AI 大模型解析服务
│   └── question-import.service.ts # 题目入库服务
├── controllers/
│   └── ai-import.controller.ts
└── dto/
    └── ai-import.dto.ts
```

### 6.2 文件解析服务 (`file-parser.service.ts`)

```typescript
import { Injectable } from '@nestjs/common'
import * as mammoth from 'mammoth'
import * as pdfParse from 'pdf-parse'

@Injectable()
export class FileParserService {
  /**
   * 解析 Word (.docx)
   */
  async parseWord(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  /**
   * 解析 PDF（文本型）
   */
  async parsePdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer)
    return data.text
  }

  /**
   * 解析图片（返回 Base64，供 OCR 使用）
   */
  async parseImage(buffer: Buffer): Promise<string> {
    return buffer.toString('base64')
  }
}
```

### 6.3 AI 解析服务 (`ai-parser.service.ts`)

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface ParsedQuestion {
  questionType: 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'FILL'
  content: string
  options?: { label: string; content: string; isCorrect: boolean }[]
  answer: string
  explanation?: string
}

@Injectable()
export class AiParserService {
  constructor(private config: ConfigService) {}

  /**
   * 调用火山引擎豆包大模型解析题目
   */
  async parseQuestions(text: string): Promise<ParsedQuestion[]> {
    const apiKey = this.config.get('VOLCENGINE_AI_KEY')
    const endpoint = this.config.get('VOLCENGINE_AI_ENDPOINT')

    const prompt = `
你是一名专业的题目结构化助手。请从以下文本中提取所有题目，并以 JSON 数组格式返回。

每道题目的格式：
{
  "questionType": "SINGLE" | "MULTIPLE" | "JUDGE" | "FILL",
  "content": "题目内容（不包含选项）",
  "options": [
    { "label": "A", "content": "选项 A 内容", "isCorrect": true/false },
    ...
  ],
  "answer": "正确答案（单选/判断：A/B/C/D；多选：ABCD；填空：答案内容）",
  "explanation": "题目解析（可选）"
}

要求：
1. 准确识别题型（单选/多选/判断/填空）
2. 选择题的选项只包含 label 和 content，isCorrect 根据答案自动判断
3. 判断题的选项固定为 A.正确 B.错误
4. 填空题如果没有明确答案，标记 answer 为 "UNKNOWN"
5. 如果无法识别为题目，跳过该段落

以下是需要解析的文本：
---
${text}
---

请直接返回 JSON 数组，不要包含任何其他说明文字。
`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'doubao-pro-32k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,  // 低温度，确保输出稳定
      }),
    })

    const data = await response.json()
    const jsonText = data.choices[0].message.content.trim()

    // 移除可能的 markdown 代码块标记
    const cleanJson = jsonText.replace(/^```json\s*|\s*```$/g, '')

    return JSON.parse(cleanJson)
  }
}
```

### 6.4 AI 导入服务 (`ai-import.service.ts`)

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { FileParserService } from './file-parser.service'
import { AiParserService } from './ai-parser.service'

@Injectable()
export class AiImportService {
  constructor(
    private prisma: PrismaService,
    private fileParser: FileParserService,
    private aiParser: AiParserService,
  ) {}

  /**
   * 创建导入任务并异步处理
   */
  async createTask(
    tenantId: string,
    userId: string,
    files: { name: string; buffer: Buffer; type: string }[],
  ) {
    // 创建主任务记录
    const task = await this.prisma.aiImportTask.create({
      data: {
        tenantId,
        userId,
        fileType: files[0].type,
        fileName: files.map(f => f.name).join(', '),
        fileUrl: '',  // 上传 OSS 后填充
        status: 'pending',
      },
    })

    // 异步处理（生产环境应使用队列）
    this.processTask(task.id, files).catch(console.error)

    return task
  }

  /**
   * 异步处理任务
   */
  async processTask(taskId: string, files: Array<{ name: string; buffer: Buffer; type: string }>) {
    await this.prisma.aiImportTask.update({
      where: { id: taskId },
      data: { status: 'processing' },
    })

    const allQuestions = []

    for (const file of files) {
      try {
        // 1. 文件解析
        let text: string
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          text = await this.fileParser.parseWord(file.buffer)
        } else if (file.type === 'application/pdf') {
          text = await this.fileParser.parsePdf(file.buffer)
        } else if (file.type.startsWith('image/')) {
          // 图片需要 OCR（调用火山 OCR API）
          text = await this.fileParser.parseImage(file.buffer)
          text = await this.ocrService.recognize(text)
        }

        // 2. AI 解析
        const questions = await this.aiParser.parseQuestions(text)
        allQuestions.push(...questions)

        // 3. 保存为待校对项
        for (const q of questions) {
          await this.prisma.aiImportItem.create({
            data: {
              taskId,
              questionType: q.questionType,
              content: q.content,
              options: q.options as any,
              answer: q.answer,
              explanation: q.explanation,
              status: 'pending',
            },
          })
        }
      } catch (error) {
        console.error(`文件 ${file.name} 处理失败:`, error)
      }
    }

    // 4. 更新任务状态
    await this.prisma.aiImportTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        totalCount: allQuestions.length,
        completedAt: new Date(),
      },
    })
  }

  /**
   * 确认导入（批量入库）
   */
  async confirmImport(
    taskId: string,
    tenantId: string,
    categoryId: string,
    difficulty: string,
  ) {
    const items = await this.prisma.aiImportItem.findMany({
      where: { taskId, status: 'pending' },
    })

    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const item of items) {
      try {
        // 创建题目和选项
        const question = await this.prisma.question.create({
          data: {
            tenantId,
            categoryId,
            type: item.questionType as any,
            difficulty: difficulty as any,
            content: item.content,
            explanation: item.explanation,
          },
        })

        // 创建选项（如果有）
        if (item.options) {
          const options = (item.options as any[]).map((opt, idx) => ({
            questionId: question.id,
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
            sortOrder: idx,
          }))
          await this.prisma.questionOption.createMany({ data: options })
        }

        // 更新导入项状态
        await this.prisma.aiImportItem.update({
          where: { id: item.id },
          data: { status: 'imported', importedId: question.id },
        })

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`题目"${item.content.slice(0, 20)}..."导入失败：${error.message}`)
      }
    }

    // 更新任务统计
    await this.prisma.aiImportTask.update({
      where: { id: taskId },
      data: {
        successCount: results.success,
        errorCount: results.failed,
      },
    })

    return results
  }
}
```

---

## 七、测试方案

### 7.1 测试数据准备

| 文件类型 | 文件名 | 题目数量 | 题型 | 说明 |
|---------|--------|---------|------|------|
| Word | `中医诊断学试卷.docx` | 25 题 | 单选 + 多选 + 判断 | 标准格式，含答案解析 |
| Word | `中药学题库.docx` | 50 题 | 单选 | 仅有题目和答案，无解析 |
| PDF | `针灸学习题.pdf` | 30 题 | 单选 + 填空 | 文本型 PDF |
| PDF | `推拿学试卷_扫描版.pdf` | 20 题 | 单选 + 多选 | 扫描版（图片型 PDF） |
| 图片 | `题目 1.png` | 5 题 | 单选 | 手机拍照 |
| 图片 | `题目 2.jpg` | 3 题 | 判断 | 截图 |

### 7.2 功能测试用例

| 编号 | 测试项 | 操作步骤 | 预期结果 | 优先级 |
|------|--------|---------|---------|--------|
| F01 | Word 文件上传 | 上传标准格式 Word 文件 | 文件上传成功，任务创建 | P0 |
| F02 | PDF 文件上传 | 上传文本型 PDF | 文件上传成功，任务创建 | P0 |
| F03 | 图片文件上传 | 上传 JPG/PNG 图片 | 文件上传成功，任务创建 | P0 |
| F04 | 多文件批量上传 | 同时上传 3 个不同类型文件 | 所有文件上传成功 | P1 |
| F05 | AI 识别准确率 | 识别 25 题 Word 文档 | 题型识别准确率≥90% | P0 |
| F06 | 选项提取正确性 | 选择题选项完整提取 | 选项内容、顺序、答案正确 | P0 |
| F07 | 解析提取 | 有解析的题目 | 解析内容正确提取 | P1 |
| F08 | 校对界面展示 | 查看待校对题目 | 题目、选项、答案正确显示 | P0 |
| F09 | 手动修改题目 | 修改题目内容/选项/答案 | 修改保存成功 | P0 |
| F10 | 批量确认导入 | 选中 10 题批量导入 | 10 题成功入库 | P0 |
| F11 | 跳过题目 | 标记 3 题跳过 | 跳过题目不入库 | P1 |
| F12 | 删除题目 | 删除识别错误的题目 | 题目不入库 | P1 |
| F13 | 选择分类 | 导入时选择目标分类 | 题目归属正确分类 | P0 |
| F14 | 设置难度 | 导入时统一设置难度 | 题目难度正确设置 | P1 |
| F15 | 扫描版 PDF 识别 | 上传扫描版 PDF | OCR 识别成功，题目可识别 | P2 |
| F16 | 进度展示 | 查看识别进度 | 实时显示处理进度 | P1 |
| F17 | 后台继续处理 | 关闭弹窗后查看任务列表 | 任务后台继续处理 | P2 |
| F18 | 任务历史记录 | 查看历史导入任务 | 显示任务列表和结果 | P2 |
| F19 | 大文件处理 | 上传 50MB 文件 | 支持大文件，不超时 | P2 |
| F20 | 异常格式处理 | 上传非题目文本 | AI 提示"未识别到题目" | P2 |

### 7.3 性能测试

| 测试项 | 目标 | 说明 |
|--------|------|------|
| 单文件识别速度 | ≤30 秒/25 题 | 包含文件上传 + AI 解析 |
| 批量处理能力 | 同时处理 5 个文件 | 不阻塞、不崩溃 |
| 并发支持 | 10 个用户同时上传 | 任务队列正常调度 |
| 大文件支持 | 最大 50MB | 上传超时时间 5 分钟 |

### 7.4 AI 识别准确率测试

**测试方法**：使用 100 道已知标准答案的题目，统计 AI 识别准确率。

| 指标 | 目标值 | 计算方法 |
|------|--------|---------|
| 题型识别准确率 | ≥95% | 正确识别题型数 / 总题目数 |
| 题目内容完整率 | ≥98% | 内容完整题目数 / 总题目数 |
| 选项提取准确率 | ≥95% | 正确提取选项数 / 总选项数 |
| 答案识别准确率 | ≥98% | 正确答案数 / 总题目数 |
| 解析提取准确率 | ≥90% | 正确提取解析数 / 有解析题目数 |

---

## 八、开发任务清单

### Phase 1: 数据库与服务层（3 天）
- [ ] 数据库表：`AiImportTask`, `AiImportItem`
- [ ] `FileParserService`: Word/PDF/图片解析
- [ ] `AiParserService`: AI 大模型解析
- [ ] `AiImportService`: 导入任务管理
- [ ] 火山引擎 API 配置（OCR + 豆包大模型）

### Phase 2: 接口层（2 天）
- [ ] `AiImportController`: 上传/查询/确认接口
- [ ] 文件上传中间件（multer 配置）
- [ ] 异步任务队列（可选：Bull + Redis）
- [ ] OSS 文件存储（可选）

### Phase 3: 前端界面（3 天）
- [ ] `AiImportDialog.vue`: 上传弹窗
- [ ] `AiImportProgress.vue`: 进度展示
- [ ] `AiImportReview.vue`: 校对界面
- [ ] `AiImportEdit.vue`: 题目编辑
- [ ] `AiImportHistory.vue`: 历史记录

### Phase 4: 测试与优化（2 天）
- [ ] 功能测试（20 个测试用例）
- [ ] AI 识别准确率测试与调优
- [ ] 性能测试与优化
- [ ] 用户文档编写

**预计总工期**：10 个工作日

---

## 九、风险与注意事项

| 风险项 | 影响 | 缓解措施 |
|--------|------|---------|
| AI 识别准确率不稳定 | 用户体验差 | 人工校对环节必填；持续优化 Prompt |
| 扫描版 PDF 识别效果差 | 无法提取文字 | 接入更强大的 OCR 服务；支持手动修正 |
| 大文件上传超时 | 用户无法导入 | 分片上传；异步处理；进度展示 |
| AI API 调用成本高 | 运营成本增加 | 设置单用户限额；按量计费提示 |
| 题目格式多样 | 识别困难 | 支持多种模板；允许手动修正 |

---

## 十、后续优化方向

1. **题目去重检测**：导入前检查题库中是否已有相同题目
2. **智能分类推荐**：AI 根据题目内容推荐分类
3. **难度自动识别**：AI 根据题目内容自动判断难度
4. **模板学习**：用户上传多次后，AI 学习该用户的题目格式偏好
5. **批量导出校对结果**：支持导出 AI 识别结果为 Word/Excel，便于线下核对

---

## 附录：AI Prompt 模板

### 通用题目解析 Prompt

```
你是一名专业的题目结构化助手。请从以下文本中提取所有题目，并以 JSON 数组格式返回。

每道题目的格式：
{
  "questionType": "SINGLE" | "MULTIPLE" | "JUDGE" | "FILL",
  "content": "题目内容（不包含选项）",
  "options": [
    { "label": "A", "content": "选项 A 内容", "isCorrect": true/false },
    ...
  ],
  "answer": "正确答案（单选/判断：A/B/C/D；多选：ABCD；填空：答案内容）",
  "explanation": "题目解析（可选）"
}

要求：
1. 准确识别题型（单选/多选/判断/填空）
2. 选择题的选项只包含 label 和 content，isCorrect 根据答案自动判断
3. 判断题的选项固定为 A.正确 B.错误
4. 填空题如果没有明确答案，标记 answer 为"UNKNOWN"
5. 如果无法识别为题目，跳过该段落

以下是需要解析的文本：
---
{文本内容}
---

请直接返回 JSON 数组，不要包含任何其他说明文字。
```
