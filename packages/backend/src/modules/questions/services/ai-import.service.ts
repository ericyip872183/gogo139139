/**
 * AI 导入题库服务
 * 负责文件上传、AI 解析、重复检测、题目入库
 *
 * 使用火山引擎 Responses API 进行文档理解
 * 官方文档：https://www.volcengine.com/docs/82379/1902647
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../prisma/prisma.service'
import { createWriteStream } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs/promises'
import * as https from 'https'
import { URL } from 'url'

// ━━━ 环境变量控制日志开关 ━━━
const DEBUG = process.env.DEBUG_AI_IMPORT === 'true'

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

function log(level: LogLevel, context: string, message: string, data?: any) {
  if (!DEBUG && level !== LogLevel.ERROR) return
  const timestamp = new Date().toISOString()
  const logData = data ? ` | ${JSON.stringify(data)}` : ''
  console.log(`[AI-IMPORT][${level}][${timestamp}][${context}] ${message}${logData}`)
}

const debugLog = (context: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[AI-IMPORT][DEBUG][${context}] ${message}`, data ? JSON.stringify(data) : '')
  }
}

@Injectable()
export class AiImportService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    log(LogLevel.INFO, 'AiImportService', 'AI 导入服务初始化')
  }

  /**
   * 上传文件并创建导入任务
   */
  async createImportTask(
    tenantId: string,
    userId: string,
    files: Express.Multer.File[],
    categoryId?: string,
    model?: string,
  ) {
    log(LogLevel.INFO, 'createImportTask', '开始创建导入任务', {
      tenantId, userId, fileCount: files?.length || 0, categoryId, model,
    })

    if (!files || files.length === 0) {
      throw new BadRequestException('请上传至少一个文件')
    }

    // 创建导入任务
    const task = await this.prisma.aiImportTask.create({
      data: {
        tenantId,
        userId,
        fileType: files[0].mimetype.includes('pdf') ? 'pdf' :
                  files[0].mimetype.includes('word') || files[0].mimetype.includes('openxmlformats-officedocument.wordprocessingml') ? 'word' :
                  files[0].mimetype.includes('image') ? 'image' :
                  files[0].mimetype.includes('text') || files[0].originalname.endsWith('.txt') ? 'txt' :
                  files[0].mimetype.includes('excel') || files[0].mimetype.includes('spreadsheetml') ? 'excel' : 'other',
        fileName: files.map(f => f.originalname).join(', '),
        fileUrl: '',
        model: model || '',
        status: 'pending',
        totalCount: 0,
      },
    })

    // 上传文件并异步处理
    const uploadedFiles = await Promise.all(
      files.map(file => this.uploadFile(file, tenantId, task.id)),
    )

    // 异步处理文件（不阻塞响应）
    this.processFiles(task.id, uploadedFiles, tenantId, model).catch(err => {
      log(LogLevel.ERROR, 'processFiles', '异步处理失败', { error: err.message })
    })

    return { taskId: task.id, fileCount: files.length, status: 'processing' }
  }

  /**
   * 上传单个文件到临时目录
   */
  private async uploadFile(
    file: Express.Multer.File,
    tenantId: string,
    taskId: string,
  ): Promise<string> {
    const ext = file.originalname.split('.').pop() || 'bin'
    const filename = `${uuidv4()}.${ext}`
    const uploadDir = join(process.cwd(), 'uploads', 'ai-import', tenantId, taskId)
    const filePath = join(uploadDir, filename)

    await fs.mkdir(uploadDir, { recursive: true })

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath)
      stream.write(file.buffer)
      stream.on('finish', () => resolve())
      stream.on('error', (err) => reject(err))
      stream.end()
    })

    return filePath
  }

  /**
   * 异步处理文件，调用 AI 解析
   */
  private async processFiles(
    taskId: string,
    filePaths: string[],
    tenantId: string,
    model?: string,
  ) {
    await this.prisma.aiImportTask.update({
      where: { id: taskId },
      data: { status: 'processing' },
    })

    const allParsedQuestions = []

    for (const filePath of filePaths) {
      try {
        const parsedQuestions = await this.parseQuestionsWithAI(filePath, tenantId, model)
        allParsedQuestions.push(...parsedQuestions)

        // 保存为待校对项
        for (const q of parsedQuestions) {
          await this.prisma.aiImportItem.create({
            data: {
              taskId,
              questionType: q.questionType,
              content: q.content,
              options: q.options as any,
              answer: q.answer,
              explanation: q.explanation,
              difficulty: q.difficulty || 'MEDIUM',
              status: 'pending',
            },
          })
        }
      } catch (error) {
        log(LogLevel.ERROR, 'processFiles', '文件处理失败', {
          filePath, error: error.message,
        })
        await this.prisma.aiImportTask.update({
          where: { id: taskId },
          data: { errorMessage: error.message },
        })
      }
    }

    await this.prisma.aiImportTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        totalCount: allParsedQuestions.length,
        completedAt: new Date(),
      },
    })
  }

  /**
   * 调用 AI 大模型解析文件中的题目（使用 Responses API）
   */
  private async parseQuestionsWithAI(filePath: string, tenantId: string, model?: string): Promise<any[]> {
    const startTime = Date.now()

    // ━━━ 第 1 步：从数据库查询 AI 配置 ━━━
    let apiKey: string | undefined
    let baseUrl: string | undefined
    let aiModel: string | undefined

    const tenantModel = await this.prisma.tenantAiModel.findFirst({
      where: { tenantId, scene: 'question_import', isDefault: true, isEnabled: true },
      include: { model: { include: { provider: true } } },
    })

    if (tenantModel && tenantModel.model) {
      apiKey = tenantModel.model.provider.apiKey
      baseUrl = tenantModel.model.provider.baseUrl
      aiModel = tenantModel.model.modelId
    } else if (model) {
      const aiModelRecord = await this.prisma.aiModel.findFirst({
        where: { modelId: model, isEnabled: true },
        include: { provider: true },
      })
      if (aiModelRecord && aiModelRecord.provider) {
        apiKey = aiModelRecord.provider.apiKey
        baseUrl = aiModelRecord.provider.baseUrl
        aiModel = aiModelRecord.modelId
      }
    }

    if (!apiKey) {
      const defaultProvider = await this.prisma.aiProvider.findFirst({
        where: { isEnabled: true, name: { contains: '火山' } },
        include: { models: { where: { isEnabled: true }, take: 1 } },
      })
      if (defaultProvider) {
        apiKey = defaultProvider.apiKey
        baseUrl = defaultProvider.baseUrl
        aiModel = defaultProvider.models[0]?.modelId || ''
      }
    }

    if (!apiKey) {
      throw new BadRequestException('AI API Key 未配置，请联系管理员')
    }

    // 读取文件
    const buffer = await fs.readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()
    // 支持文档类型：pdf, docx, txt, xlsx
    const isDocument = ['pdf', 'docx', 'txt', 'xlsx', 'xls'].includes(ext || '')

    // ━━━ 第 2 步：上传文件到火山引擎，获取 file_id ━━━
    const fileId = await this.uploadFileToVolcano(buffer, filePath.split('/').pop() || 'file', apiKey)

    // ━━━ 第 3 步：构建 Responses API 请求 ━━━
    // 官方文档：https://www.volcengine.com/docs/82379/1902647
    // 文档理解使用 /responses 端点，input 参数，input_text 类型
    const promptText = `你是一名专业的题目结构化助手。请分析这个文件，提取所有题目，并以 JSON 数组格式返回。

每道题目的格式：
{
  "questionType": "SINGLE" | "MULTIPLE" | "JUDGE" | "FILL",
  "content": "题目内容（不包含选项）",
  "options": [
    { "label": "A", "content": "选项 A 内容", "isCorrect": true/false },
    ...
  ],
  "answer": "正确答案（单选/判断：A/B/C/D；多选：ABCD；填空：答案内容）",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "explanation": "题目解析（可选）"
}

要求：
1. 准确识别题型（单选/多选/判断/填空）
2. 选择题的选项只包含 label 和 content，isCorrect 根据答案判断
3. 判断题的选项固定为 A.正确 B.错误
4. 填空题如果没有明确答案，标记 answer 为"UNKNOWN"
5. 直接返回 JSON 数组，不要包含任何其他说明文字`

    // Responses API 请求格式
    const requestBody = {
      model: aiModel,
      input: [{
        role: 'user',
        content: [
          // 文档使用 input_file + file_id
          {
            type: 'input_file',
            file_id: fileId,
          },
          // 文本使用 input_text（不是 text）
          {
            type: 'input_text',
            text: promptText,
          },
        ],
      }],
      temperature: 0.1,
    }

    // 使用 Responses API 端点
    const endpoint = `${baseUrl}/responses`

    console.log('\n' + '='.repeat(80))
    console.log('【AI 导入 - Responses API 请求】')
    console.log('端点:', endpoint)
    console.log('请求体:', JSON.stringify(requestBody, null, 2))
    console.log('='.repeat(80) + '\n')

    // ━━━ 第 4 步：发送请求 ━━━
    let data: any
    try {
      data = await this.httpsPost(endpoint, apiKey, requestBody)
    } catch (error) {
      throw new Error(`AI API 调用失败：${error.message}`)
    }

    // ━━━ 第 5 步：解析响应 ━━━
    // Responses API 响应格式：output 数组包含 message 对象，content[0].text 为实际内容
    let jsonText: string

    // 尝试从 output 数组中提取 message 内容
    if (Array.isArray(data.output)) {
      const messageOutput = data.output.find((item: any) => item.type === 'message' && item.content?.[0]?.text)
      if (messageOutput?.content?.[0]?.text) {
        jsonText = messageOutput.content[0].text
      } else {
        console.log('AI 原始响应:', JSON.stringify(data, null, 2))
        throw new Error('AI 响应格式异常：未找到 message 内容')
      }
    } else if (data.output?.text) {
      jsonText = data.output.text
    } else if (data.choices?.[0]?.message?.content) {
      jsonText = data.choices[0].message.content
    } else {
      console.log('AI 原始响应:', JSON.stringify(data, null, 2))
      throw new Error('AI 响应格式异常')
    }

    // 移除 markdown 代码块标记
    const cleanJson = jsonText.replace(/^```json\s*|\s*```$/g, '').trim()

    let parsedQuestions: any[]
    try {
      parsedQuestions = JSON.parse(cleanJson)
      log(LogLevel.INFO, 'parseQuestionsWithAI', 'JSON 解析成功', {
        questionCount: parsedQuestions.length,
      })
    } catch (error) {
      console.log('AI 返回的原始内容:', jsonText)
      console.log('清理后的内容:', cleanJson)
      throw new Error(`JSON 解析失败：${error.message}`)
    }

    return parsedQuestions
  }

  /**
   * 获取导入任务列表
   */
  async getTaskList(tenantId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [total, list] = await Promise.all([
      this.prisma.aiImportTask.count({ where: { tenantId } }),
      this.prisma.aiImportTask.findMany({
        where: { tenantId },
        skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return { total, list, page, pageSize }
  }

  /**
   * 获取任务详情
   */
  async getTaskDetail(tenantId: string, taskId: string) {
    const task = await this.prisma.aiImportTask.findFirst({
      where: { id: taskId, tenantId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })

    if (!task) throw new NotFoundException('任务不存在')

    const itemsWithDuplicate = await Promise.all(
      task.items.map(async (item: any) => {
        const duplicate = await this.checkDuplicate(tenantId, item.content)
        return { ...item, isDuplicate: duplicate.isDuplicate, similarity: duplicate.similarity, existingQuestion: duplicate.existingQuestion }
      })
    )

    return { ...task, items: itemsWithDuplicate }
  }

  /**
   * 检查题目重复
   */
  async checkDuplicate(tenantId: string, content: string) {
    const keywords = this.extractKeywords(content)
    const existingQuestions = await this.prisma.question.findMany({
      where: { tenantId, isActive: true, content: { contains: keywords[0] || '' } },
      take: 10,
    })

    for (const q of existingQuestions) {
      const similarity = this.calculateSimilarity(keywords, this.extractKeywords(q.content))
      if (similarity >= 0.85) {
        return {
          isDuplicate: true, similarity,
          existingQuestion: { id: q.id, content: q.content, categoryId: q.categoryId },
        }
      }
    }

    return { isDuplicate: false, similarity: 0 }
  }

  private extractKeywords(content: string): string[] {
    const stopwords = new Set(['的', '了', '是', '在', '和', '或', '与', '等', '及', '之', '一个', '下列', '哪项', '关于'])
    const words = content.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]+/g) || []
    return [...new Set(words.filter(w => !stopwords.has(w)))]
  }

  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)
    const intersection = [...set1].filter(x => set2.has(x)).length
    const union = new Set([...set1, ...set2]).size
    return intersection / union || 0
  }

  /**
   * 确认导入
   */
  async confirmImport(
    taskId: string,
    tenantId: string,
    itemIds: string[],
    categoryId: string,
    difficulty?: string,
  ) {
    const items = await this.prisma.aiImportItem.findMany({
      where: { id: { in: itemIds }, taskId },
    })

    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const item of items) {
      try {
        const question = await this.prisma.question.create({
          data: {
            tenantId, categoryId,
            type: item.questionType as any,
            difficulty: (difficulty || item.difficulty || 'MEDIUM') as any,
            content: item.content,
            explanation: item.explanation,
          },
        })

        if (item.options) {
          const options = (item.options as any[]).map((opt, idx) => ({
            questionId: question.id,
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
            sortOrder: opt.sortOrder ?? idx,
          }))
          await this.prisma.questionOption.createMany({ data: options })
        }

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

    await this.prisma.aiImportTask.update({
      where: { id: taskId },
      data: { successCount: results.success, errorCount: results.failed },
    })

    return results
  }

  /**
   * 跳过题目
   */
  async skipItems(taskId: string, itemIds: string[]) {
    await this.prisma.aiImportItem.updateMany({
      where: { id: { in: itemIds }, taskId },
      data: { status: 'skipped' },
    })
    return { skipped: itemIds.length }
  }

  /**
   * 删除任务
   */
  async deleteTask(tenantId: string, taskId: string) {
    const task = await this.prisma.aiImportTask.findFirst({
      where: { id: taskId, tenantId },
    })

    if (!task) throw new NotFoundException('任务不存在')

    await this.prisma.aiImportItem.deleteMany({ where: { taskId } })
    await this.prisma.aiImportTask.delete({ where: { id: taskId } })

    const uploadDir = join(process.cwd(), 'uploads', 'ai-import', tenantId, taskId)
    try {
      await fs.rm(uploadDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }

    return { success: true }
  }

  /**
   * 上传文件到火山引擎（Files API）
   */
  private async uploadFileToVolcano(
    buffer: Buffer,
    filename: string,
    apiKey: string,
  ): Promise<string> {
    const uploadUrl = 'https://ark.cn-beijing.volces.com/api/v3/files'
    const boundary = '----FormBoundary' + Date.now()
    const CRLF = '\r\n'

    const parts: Buffer[] = []
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: application/octet-stream${CRLF}${CRLF}`))
    parts.push(buffer)
    parts.push(Buffer.from(CRLF))
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="purpose"${CRLF}${CRLF}user_data${CRLF}`))
    parts.push(Buffer.from(`--${boundary}--${CRLF}`))

    const body = Buffer.concat(parts)

    const response = await new Promise<any>((resolve, reject) => {
      const url = new URL(uploadUrl)
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      }, (res) => {
        let responseBody = ''
        res.on('data', (chunk) => { responseBody += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseBody))
          } catch {
            reject(new Error(`Invalid JSON response: ${responseBody.substring(0, 200)}`))
          }
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })

    if (response.error) {
      throw new Error(`文件上传失败：${response.error.message}`)
    }

    // 等待文件状态变为 active
    let fileId = response.id
    let status = response.status
    if (status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return fileId
  }

  /**
   * HTTPS POST 请求
   */
  private httpsPost(urlStr: string, apiKey: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr)
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(JSON.stringify(data)),
        },
      }, (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(body)) }
          catch { reject(new Error(`Invalid JSON response: ${body.substring(0, 200)}`)) }
        })
      })
      req.on('error', reject)
      req.write(JSON.stringify(data))
      req.end()
    })
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const expiredTasks = await this.prisma.aiImportTask.findMany({
      where: { createdAt: { lt: twentyFourHoursAgo } },
      select: { id: true, tenantId: true },
    })

    for (const task of expiredTasks) {
      const uploadDir = join(process.cwd(), 'uploads', 'ai-import', task.tenantId, task.id)
      try {
        await fs.rm(uploadDir, { recursive: true, force: true })
      } catch {
        // 忽略清理错误
      }
    }
  }
}
